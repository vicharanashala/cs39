const express = require('express');
const router = express.Router();
const { FAQThread, Answer, User, Notification, SPTransaction, Comment, SearchLog, UserActivity, Feedback, SystemMetrics, Bookmark, FAQTracker, FAQChangeLog } = require('../models/Schemas');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { updateReputation } = require('../services/reputation');
const { analyzeFAQ, scoreContentModeration } = require('../services/aiService');
const cfg = require('../config');
const { broadcastQueueUpdate } = require('../services/queueService');

async function publishFAQChangeLog(req, payload) {
  const entry = await FAQChangeLog.create({
    ...payload,
    admin: req.user._id,
    adminName: req.user.username,
    isPublished: true
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('faq_changelog_update', {
      _id: entry._id,
      title: entry.title,
      changeType: entry.changeType,
      isPinned: entry.isPinned,
      createdAt: entry.createdAt
    });
    io.to('role_student').emit('notification', {
      _id: `faq_update_${entry._id}_${Date.now()}`,
      title: entry.isPinned ? 'Important FAQ update' : 'FAQ update published',
      message: entry.title,
      type: 'announcement',
      createdAt: new Date()
    });
  }

  return entry;
}

const analyticsCache = new Map();
const ANALYTICS_CACHE_TTL_MS = 60 * 1000;

function getAnalyticsCache(key) {
  const cached = analyticsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    analyticsCache.delete(key);
    return null;
  }
  return cached.value;
}

function setAnalyticsCache(key, value, ttlMs = ANALYTICS_CACHE_TTL_MS) {
  analyticsCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

function clearAnalyticsCache() {
  analyticsCache.clear();
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildDateFilter(query) {
  const filter = {};
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if (from && !Number.isNaN(from.getTime())) filter.$gte = from;
  if (to && !Number.isNaN(to.getTime())) {
    to.setHours(23, 59, 59, 999);
    filter.$lte = to;
  }
  return Object.keys(filter).length ? filter : null;
}

// Apply admin guard to all routes in this file
router.use(authMiddleware);
router.use(requireRole('admin'));

// GET /api/admin/changelog - Admin changelog dashboard data
router.get('/changelog', async (req, res) => {
  try {
    const updates = await FAQChangeLog.find()
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(80)
      .populate('threadId', 'title category faqNumber isOfficial')
      .lean();

    const metrics = updates.reduce((acc, update) => {
      acc.views += update.metrics?.views || 0;
      acc.explores += update.metrics?.explores || 0;
      acc.bookmarks += update.metrics?.bookmarks || 0;
      if (update.isPinned) acc.pinned += 1;
      return acc;
    }, { views: 0, explores: 0, bookmarks: 0, pinned: 0, total: updates.length });

    res.json({ updates, metrics });
  } catch (error) {
    console.error('Admin changelog fetch error:', error.message);
    res.status(500).json({ message: 'Error fetching changelog dashboard' });
  }
});

// POST /api/admin/changelog/announcement - Publish a standalone update
router.post('/changelog/announcement', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim().slice(0, 180);
    const body = String(req.body.body || '').trim().slice(0, 2000);
    const reason = String(req.body.reason || '').trim().slice(0, 500) || 'Admin announcement';
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and announcement body are required' });
    }

    const entry = await publishFAQChangeLog(req, {
      title,
      category: req.body.category || 'Announcements',
      changeType: req.body.changeType === 'important' ? 'important' : 'announcement',
      oldContent: {},
      newContent: { title, body, answer: body, category: req.body.category || 'Announcements' },
      reason,
      isPinned: Boolean(req.body.isPinned)
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Publish changelog announcement error:', error.message);
    res.status(500).json({ message: 'Error publishing changelog announcement' });
  }
});

// PATCH /api/admin/changelog/:id - Pin/unpin or publish/unpublish an update
router.patch('/changelog/:id', async (req, res) => {
  try {
    const update = await FAQChangeLog.findById(req.params.id);
    if (!update) return res.status(404).json({ message: 'Changelog entry not found' });
    if (typeof req.body.isPinned === 'boolean') update.isPinned = req.body.isPinned;
    if (typeof req.body.isPublished === 'boolean') update.isPublished = req.body.isPublished;
    update.updatedAt = new Date();
    await update.save();
    res.json(update);
  } catch (error) {
    console.error('Update changelog entry error:', error.message);
    res.status(500).json({ message: 'Error updating changelog entry' });
  }
});

// PUT /api/admin/official-faq/:threadId - Edit an existing official FAQ and log the diff
router.put('/official-faq/:threadId', async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ message: 'Official FAQ not found' });
    if (!thread.isOfficial) return res.status(400).json({ message: 'Only official FAQs can be edited here' });

    const answer = await Answer.findOne({ threadId: thread._id, isVerified: true }).sort({ createdAt: -1 });
    const oldSnapshot = {
      title: thread.title || '',
      body: thread.body || '',
      answer: answer?.body || '',
      category: thread.category || ''
    };

    const title = String(req.body.title || thread.title).trim().slice(0, 180);
    const body = String(req.body.body || thread.body).trim().slice(0, 4000);
    const category = req.body.category || thread.category;
    const answerBody = typeof req.body.answerBody === 'string'
      ? req.body.answerBody.trim().slice(0, 4000)
      : answer?.body;

    thread.title = title;
    thread.body = body;
    thread.category = category;
    thread.updatedAt = new Date();
    await thread.save();

    if (answer && answerBody) {
      answer.body = answerBody;
      await answer.save();
    }

    const entry = await publishFAQChangeLog(req, {
      threadId: thread._id,
      title: thread.title,
      category: thread.category,
      changeType: req.body.changeType === 'important' ? 'important' : 'updated',
      oldContent: oldSnapshot,
      newContent: {
        title: thread.title || '',
        body: thread.body || '',
        answer: answer?.body || '',
        category: thread.category || ''
      },
      reason: String(req.body.reason || '').trim().slice(0, 500) || 'Official FAQ content was edited.',
      isPinned: Boolean(req.body.isPinned)
    });

    res.json({ thread, changelog: entry });
  } catch (error) {
    console.error('Official FAQ update error:', error.message);
    res.status(500).json({ message: 'Error updating official FAQ' });
  }
});

// GET /api/admin/moderation-queue - User-submitted FAQs awaiting publication
router.get('/moderation-queue', async (req, res) => {
  try {
    const rawQueue = await FAQThread.find({
      status: { $in: ['pending_review', 'flagged'] },
      isMerged: false
    })
      .sort({ submittedForReviewAt: 1, createdAt: 1 })
      .select('title body category status author authorName submittedForReviewAt createdAt updatedAt isMerged priority tags')
      .populate('author', 'username email spPoints trustScore')
      .lean();

    const { getQueuePosition } = require('../services/queueService');
    const queue = await Promise.all(rawQueue.map(async (thread) => {
      const pos = await getQueuePosition(thread._id);
      return { ...thread, queuePosition: pos };
    }));

    res.json(queue);
  } catch (error) {
    console.error('Fetch moderation queue error:', error.message);
    res.status(500).json({ message: 'Error retrieving moderation queue' });
  }
});

// PUT /api/admin/moderation-queue/:threadId - Edit FAQ before review decision
router.put('/moderation-queue/:threadId', async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ message: 'FAQ not found' });
    if (!['pending_review', 'flagged'].includes(thread.status)) {
      return res.status(400).json({ message: 'Only queued FAQs can be edited here' });
    }

    let { title, body, category } = req.body;
    title = String(title || '').trim().slice(0, 180);
    body = String(body || '').trim().slice(0, 4000);
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const aiAnalysis = analyzeFAQ(title, body);
    const aiScores = scoreContentModeration(body, title);

    thread.title = title;
    thread.body = body;
    thread.category = category || thread.category;
    thread.priority = aiAnalysis.priority;
    thread.tags = aiAnalysis.tags;
    thread.summary = aiAnalysis.summary;
    thread.structuredBody = aiAnalysis.structuredBody;
    thread.analysisMetadata = aiAnalysis.analysisMetadata;
    thread.aiScores = aiScores;
    thread.updatedAt = Date.now();
    await thread.save();

    res.json(thread);
  } catch (error) {
    console.error('Edit queued FAQ error:', error.message);
    res.status(500).json({ message: 'Error updating queued FAQ' });
  }
});

// POST /api/admin/moderation-queue/:threadId/review - Approve or reject publication
router.post('/moderation-queue/:threadId/review', async (req, res) => {
  try {
    const { action, reason, penaltyPoints } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Review action must be approve or reject' });
    }

    const thread = await FAQThread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ message: 'FAQ not found' });
    if (!['pending_review', 'flagged'].includes(thread.status)) {
      return res.status(400).json({ message: 'FAQ is not awaiting review' });
    }

    if (action === 'approve') {
      thread.reviewedBy = req.user._id;
      thread.reviewedAt = Date.now();
      thread.rejectionReason = null;
      thread.rejectionPenaltyPoints = 0;
      thread.status = 'active';
      thread.aiScores.toxicityScore = 0;
      thread.aiScores.spamProbability = 0;
      await thread.save();

      // Broadcast queue updates to all clients
      try { broadcastQueueUpdate(req.app.get('io')); } catch (e) {}

      await Notification.create({
        userId: thread.author,
        title: 'FAQ Published',
        message: `Your FAQ "${thread.title.substring(0, 60)}" has been approved and published.`,
        type: 'verification'
      });

      res.json({ message: `FAQ approved successfully`, thread });
    } else {
      // action === 'reject'
      const rejectionReason = String(reason || '').trim().slice(0, 500) || 'Not approved for publication.';
      const penalty = Number(penaltyPoints) || 0;

      thread.reviewedBy = req.user._id;
      thread.reviewedAt = Date.now();
      thread.rejectionReason = rejectionReason;
      thread.rejectionPenaltyPoints = penalty;
      thread.status = 'rejected';
      await thread.save();

      // Send rejection notification
      await Notification.create({
        userId: thread.author,
        title: '❌ Question Not Approved',
        message: `Your question "${thread.title.substring(0, 60)}" was not approved. Reason: ${rejectionReason}`,
        type: 'verification'
      });

      // Emit live socket notification just like approve
      const notif = {
        _id: `thread_reject_socket_${thread._id}_${Date.now()}`,
        userId: thread.author,
        title: '❌ Question Not Approved',
        message: `Your question "${thread.title.substring(0, 60)}" was not approved. Reason: ${rejectionReason}`,
        type: 'rejection',
        createdAt: new Date()
      };
      const io = req.app.get('io');
      if (io) {
        io.to(thread.author.toString()).emit('notification', notif);
      }

      // Deduct SP points if requested
      if (penalty > 0) {
        await updateReputation(thread.author, -Math.abs(penalty), 'rejection_penalty');
      }

      // Broadcast queue updates to all clients
      try { broadcastQueueUpdate(req.app.get('io')); } catch (e) {}

      res.json({ message: `FAQ rejected successfully`, thread });
    }
  } catch (error) {
    console.error('Review queued FAQ error:', error.message);
    res.status(500).json({ message: 'Error reviewing queued FAQ' });
  }
});

// POST /api/admin/verify-answer/:ansId - Verify final answer
router.post('/verify-answer/:ansId', async (req, res) => {
  try {
    const { category, answerBody, questionAuthorSp, answerAuthorSp } = req.body;
    
    const answer = await Answer.findById(req.params.ansId);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    const thread = await FAQThread.findById(answer.threadId);
    if (!thread) return res.status(404).json({ message: 'Associated FAQ thread not found' });

    const oldSnapshot = {
      title: thread.title || '',
      body: thread.body || '',
      answer: answer.body || '',
      category: thread.category || ''
    };
    const wasOfficial = thread.isOfficial;

    // 1. Re-verify category on thread
    if (category) {
      thread.category = category;
    }
    thread.isOfficial = true;
    
    // 2. Edit answer body & set verified
    if (answerBody) {
      answer.body = answerBody;
    }
    answer.isVerified = true;
    answer.isPinned = false; // "no need of pinning"
    await answer.save();

    // 3. Delete all other replies for this thread
    await Answer.deleteMany({ threadId: thread._id, _id: { $ne: answer._id } });
    thread.repliesCount = 1;
    thread.updatedAt = new Date();
    await thread.save();

    // Broadcast queue updates to all clients
    try { broadcastQueueUpdate(req.app.get('io')); } catch (e) {}

    // 4. Award reputation points to question author & answer author
    const qAuthorSpNum = parseInt(req.body.questionAuthorSp, 10) || 0;
    const aAuthorSpNum = parseInt(req.body.answerAuthorSp, 10) || 0;

    // 5. Advance FAQ tracker to verified status

    const STATUS_MAP = {
      'received': 'Question Received', 'ai_analyzing': 'AI Analyzing',
      'expert_review': 'Expert Reviewing', 'verified': 'Answer Verified',
      'completed': 'Solution Completed'
    };
    let tracker = await FAQTracker.findOne({ threadId: thread._id });
    if (!tracker) {
      const ts = new Date();
      tracker = await FAQTracker.create({
        threadId: thread._id, status: 'completed',
        steps: Object.keys(STATUS_MAP).map(s => ({ status: s, label: STATUS_MAP[s], timestamp: ts }))
      });
    } else if (tracker.status !== 'completed') {
      const ts = new Date();
      ['received', 'ai_analyzing', 'expert_review', 'verified', 'completed'].forEach(statusKey => {
        if (!tracker.steps.find(step => step.status === statusKey)) {
          tracker.steps.push({ status: statusKey, label: STATUS_MAP[statusKey], timestamp: ts });
        }
      });
      tracker.status = 'completed';
      tracker.completedAt = ts;
      tracker.updatedAt = ts;
      await tracker.save();
    }

    // Emit real-time events — get io here, inside scope
    const io = req.app.get('io');
    if (io) {
      io.emit('faq_status_update', { threadId: thread._id.toString(), status: tracker.status, steps: tracker.steps });
      io.to(answer.author.toString()).emit('answer_verified', {
        threadId: thread._id,
        answerId: answer._id,
        threadTitle: thread.title
      });
      io.to(answer.author.toString()).emit('notification', {
        _id: `answer_verify_socket_${answer._id}_${Date.now()}`,
        title: '🏆 Your Answer has been Verified!',
        message: `Congratulations! Your answer on "${thread.title.substring(0, 60)}" has been verified by the IIT Ropar team. +${aAuthorSpNum} SP awarded.`,
        type: 'verification',
        createdAt: new Date()
      });
      io.to(thread.author.toString()).emit('notification', {
        _id: `thread_verify_socket_${thread._id}_${Date.now()}`,
        title: '✅ FAQ Answer Verified',
        message: `Your question "${thread.title.substring(0, 60)}" has been resolved and promoted to an official FAQ. +${qAuthorSpNum} SP awarded.`,
        type: 'verification',
        createdAt: new Date()
      });
    }

    await publishFAQChangeLog(req, {
      threadId: thread._id,
      title: thread.title,
      category: thread.category,
      changeType: wasOfficial ? 'updated' : 'new',
      oldContent: oldSnapshot,
      newContent: {
        title: thread.title || '',
        body: thread.body || '',
        answer: answer.body || '',
        category: thread.category || ''
      },
      reason: wasOfficial
        ? 'Verified answer or category was refreshed by an administrator.'
        : 'Student question was promoted into the official FAQ knowledge base.',
      isPinned: thread.priority === 'urgent'
    });

    res.json({ 
      message: 'Answer verified successfully. FAQ is now locked, category updated, and SP awarded.', 
      answer,
      thread
    });
  } catch (error) {
    console.error('Verify answer admin error:', error.message);
    res.status(500).json({ message: 'Error verifying answer' });
  }
});

// POST /api/admin/pin-answer/:ansId - Toggle pinning of answer
router.post('/pin-answer/:ansId', async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.ansId);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    answer.isPinned = !answer.isPinned;
    await answer.save();

    res.json({ message: `Answer ${answer.isPinned ? 'pinned' : 'unpinned'} successfully`, answer });
  } catch (error) {
    res.status(500).json({ message: 'Error updating pin status' });
  }
});

// POST /api/admin/make-official/:threadId - Make thread an official FAQ
router.post('/make-official/:threadId', async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    if (thread.isOfficial) {
      return res.status(400).json({ message: 'Thread is already an official FAQ' });
    }

    const oldSnapshot = {
      title: thread.title || '',
      body: thread.body || '',
      answer: '',
      category: thread.category || ''
    };

    thread.isOfficial = true;
    thread.updatedAt = new Date();
    await thread.save();

    // Broadcast queue updates to all clients
    try { broadcastQueueUpdate(req.app.get('io')); } catch (e) {}

    const authorUser = await User.findById(thread.author);
    if (authorUser && authorUser.role === 'student') {
      await updateReputation(thread.author, 10, 'official_faq');
    }

    await publishFAQChangeLog(req, {
      threadId: thread._id,
      title: thread.title,
      category: thread.category,
      changeType: 'new',
      oldContent: oldSnapshot,
      newContent: {
        title: thread.title || '',
        body: thread.body || '',
        answer: '',
        category: thread.category || ''
      },
      reason: 'Thread was promoted to an official FAQ by the admin team.',
      isPinned: thread.priority === 'urgent'
    });

    res.json({ message: 'Thread is now an official FAQ', thread });
  } catch (error) {
    res.status(500).json({ message: 'Error updating official status' });
  }
});

// POST /api/admin/merge-threads - Merge duplicate questions
router.post('/merge-threads', async (req, res) => {
  try {
    const { sourceThreadId, targetThreadId } = req.body;
    if (!sourceThreadId || !targetThreadId) {
      return res.status(400).json({ message: 'Source and target thread IDs are required' });
    }

    const source = await FAQThread.findById(sourceThreadId);
    const target = await FAQThread.findById(targetThreadId);

    if (!source || !target) {
      return res.status(404).json({ message: 'Source or Target thread not found' });
    }

    source.isMerged = true;
    source.mergedInto = target._id;
    source.status = 'merged';
    await source.save();

    // Broadcast queue updates to all clients
    try { broadcastQueueUpdate(req.app.get('io')); } catch (e) {}

    const answersToMove = await Answer.find({ threadId: source._id });
    for (let ans of answersToMove) {
      ans.threadId = target._id;
      await ans.save();
    }

    target.repliesCount += answersToMove.length;
    await target.save();

    const notif = new Notification({
      userId: source.author,
      title: '🔗 Thread Merged',
      message: `Your thread "${source.title.substring(0, 30)}..." has been merged into "${target.title.substring(0, 30)}..." by the admin team.`,
      type: 'merge'
    });
    await notif.save();
    
    res.json({ message: 'Threads merged successfully', target });
  } catch (error) {
    console.error('Merge error:', error.message);
    res.status(500).json({ message: 'Error merging duplicate threads' });
  }
});

// GET /api/admin/flagged - List items flagged by AI moderation
router.get('/flagged', async (req, res) => {
  try {
    const flaggedThreads = await FAQThread.find({ status: 'flagged' })
      .select('title body category status author authorName createdAt updatedAt aiScores')
      .lean();
    const flaggedAnswers = await Answer.find({
      $or: [
        { 'aiScores.toxicityScore': { $gte: cfg.TOXICITY_FLAG_THRESHOLD } },
        { 'aiScores.spamProbability': { $gte: cfg.SPAM_FLAG_THRESHOLD } }
      ]
    })
      .select('threadId body author authorName createdAt updatedAt aiScores')
      .lean();

    res.json({
      threads: flaggedThreads,
      answers: flaggedAnswers
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving flagged content' });
  }
});

// POST /api/admin/moderate-action - Approve/delete content
router.post('/moderate-action', async (req, res) => {
  try {
    const { itemId, itemType, action, penaltyPoints } = req.body;
    let item;

    if (itemType === 'thread') {
      item = await FAQThread.findById(itemId);
      if (!item) return res.status(404).json({ message: 'Thread not found' });

      if (action === 'approve') {
        item.status = 'active';
        await item.save();
        // Construct in-memory notification and emit via socket (do not save to DB)
        const notif = {
          _id: `thread_approve_socket_${item._id}_${Date.now()}`,
          userId: item.author,
          title: '✅ Your Question is Live!',
          message: `Great news! Your question "${item.title.substring(0, 60)}" has been approved and is now visible in the community FAQ.`,
          type: 'approval',
          createdAt: new Date()
        };
        if (req.app.get('io')) {
          req.app.get('io').to(item.author.toString()).emit('notification', notif);
        }
      } else if (action === 'reject') {
        const rejectionReason = 'Violated community guidelines.';
        const penalty = Number(penaltyPoints) || 0;

        item.status = 'rejected';
        item.rejectionReason = rejectionReason;
        item.rejectionPenaltyPoints = penalty;
        await item.save();

        const notif = {
          _id: `thread_reject_socket_${item._id}_${Date.now()}`,
          userId: item.author,
          title: '❌ Question Not Approved',
          message: `Your question "${item.title.substring(0, 60)}" was not approved. Reason: ${rejectionReason}`,
          type: 'rejection',
          createdAt: new Date()
        };
        if (req.app.get('io')) {
          req.app.get('io').to(item.author.toString()).emit('notification', notif);
        }

        await Notification.create({
          userId: item.author,
          title: '❌ Question Not Approved',
          message: `Your question "${item.title.substring(0, 60)}" was not approved. Reason: ${rejectionReason}`,
          type: 'verification'
        });

        if (penalty > 0) {
          await updateReputation(item.author, -Math.abs(penalty), 'rejection_penalty');
        }
      } else if (action === 'delete') {
        const rejectionReason = 'Violated toxicity/spam guidelines.';
        const penalty = penaltyPoints !== undefined ? Number(penaltyPoints) : 5;

        item.status = 'rejected';
        item.rejectionReason = rejectionReason;
        item.rejectionPenaltyPoints = penalty;
        await item.save();

        const notif = {
          _id: `thread_delete_socket_${item._id}_${Date.now()}`,
          userId: item.author,
          title: '❌ Question Not Approved',
          message: `Your question "${item.title.substring(0, 60)}" was not approved. Reason: ${rejectionReason}`,
          type: 'rejection',
          createdAt: new Date()
        };
        if (req.app.get('io')) {
          req.app.get('io').to(item.author.toString()).emit('notification', notif);
        }

        await Notification.create({
          userId: item.author,
          title: '❌ Question Not Approved',
          message: `Your question "${item.title.substring(0, 60)}" was not approved. Reason: ${rejectionReason}`,
          type: 'verification'
        });

        if (penalty > 0) {
          await updateReputation(item.author, -Math.abs(penalty), 'toxic_penalty');
        }
      }

      // Broadcast queue updates to all clients
      try { broadcastQueueUpdate(req.app.get('io')); } catch (e) {}
    } else {
      item = await Answer.findById(itemId);
      if (!item) return res.status(404).json({ message: 'Answer not found' });

      if (action === 'approve') {
        item.aiScores.toxicityScore = 0;
        item.aiScores.spamProbability = 0;
        await item.save();

        const thread = await FAQThread.findById(item.threadId);
        const notif = {
          _id: `answer_approve_socket_${item._id}_${Date.now()}`,
          userId: item.author,
          title: '✅ Your Answer has been Approved!',
          message: `Your answer on "${thread ? thread.title.substring(0, 60) : 'FAQ thread'}" has been approved by the moderator.`,
          type: 'approval',
          createdAt: new Date()
        };
        if (req.app.get('io')) {
          req.app.get('io').to(item.author.toString()).emit('notification', notif);
        }
      } else if (action === 'delete') {
        const thread = await FAQThread.findById(item.threadId);
        await Notification.create({
          userId: item.author,
          title: '⚠️ Answer Removed',
          message: `Your answer on "${thread ? thread.title.substring(0, 30) : 'FAQ thread'}..." was deleted by the moderator.`,
          type: 'verification'
        });

        const penalty = penaltyPoints !== undefined ? Number(penaltyPoints) : 5;
        if (penalty > 0) {
          await updateReputation(item.author, -Math.abs(penalty), 'toxic_penalty');
        }

        await Comment.deleteMany({ answerId: item._id });
        await Answer.findByIdAndDelete(itemId);
      }
    }

    res.json({ message: `Item moderated: ${action}` });
  } catch (error) {
    console.error('Moderate action error:', error.message);
    res.status(500).json({ message: 'Error performing moderation action' });
  }
});

// GET /api/admin/pending-queue — All pending threads, sortable
router.get('/pending-queue', async (req, res) => {
  try {
    const { sort = 'queueNumber' } = req.query;
    let sortCriteria;
    if (sort === 'priority') {
      sortCriteria = { priority: -1, queueNumber: 1 }; // urgent=2, high=1, normal=0
    } else if (sort === 'newest') {
      sortCriteria = { queueAssignedAt: -1 };
    } else {
      sortCriteria = { queueNumber: 1 }; // default FIFO
    }
    const rawThreads = await FAQThread.find({ status: 'pending' })
      .sort(sortCriteria)
      .select('title body category status author authorName queueNumber queueAssignedAt createdAt updatedAt priority')
      .populate('author', 'username')
      .lean();

    const { getQueuePosition } = require('../services/queueService');
    const threads = await Promise.all(rawThreads.map(async (thread) => {
      const pos = await getQueuePosition(thread._id);
      return { ...thread, queuePosition: pos };
    }));

    res.json(threads);
  } catch (error) {
    console.error('Pending queue error:', error.message);
    res.status(500).json({ message: 'Error fetching pending queue' });
  }
});

// POST /api/admin/process-queue/:threadId — Approve or reject a queued thread
router.post('/process-queue/:threadId', async (req, res) => {
  try {
    const { action, penaltyPoints } = req.body; // 'approve' | 'reject'
    const thread = await FAQThread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    if (action === 'approve') {
      thread.status = 'active';
      await thread.save();
      const notif = {
        _id: `thread_approve_socket_${thread._id}_${Date.now()}`,
        userId: thread.author,
        title: '✅ Your Question is Live!',
        message: `Your question "${thread.title.substring(0, 60)}" has been approved and is now in the community FAQ.`,
        type: 'approval',
        createdAt: new Date()
      };
      if (req.app.get('io')) {
        req.app.get('io').to(thread.author.toString()).emit('notification', notif);
      }
    } else if (action === 'reject') {
      const rejectionReason = 'Rejected by queue processing.';
      const penalty = Number(penaltyPoints) || 0;

      thread.status = 'rejected';
      thread.rejectionReason = rejectionReason;
      thread.rejectionPenaltyPoints = penalty;
      await thread.save();

      const notif = {
        _id: `thread_reject_socket_${thread._id}_${Date.now()}`,
        userId: thread.author,
        title: '❌ Question Not Approved',
        message: `Your question "${thread.title.substring(0, 60)}" was not approved. Reason: ${rejectionReason}`,
        type: 'rejection',
        createdAt: new Date()
      };
      if (req.app.get('io')) {
        req.app.get('io').to(thread.author.toString()).emit('notification', notif);
      }

      await Notification.create({
        userId: thread.author,
        title: '❌ Question Not Approved',
        message: `Your question "${thread.title.substring(0, 60)}" was not approved. Reason: ${rejectionReason}`,
        type: 'verification'
      });

      if (penalty > 0) {
        await updateReputation(thread.author, -Math.abs(penalty), 'rejection_penalty');
      }
    }

    // Broadcast queue updates to all clients
    try { broadcastQueueUpdate(req.app.get('io')); } catch (e) {}

    res.json({ message: `Queue item ${action}d`, thread });
  } catch (error) {
    console.error('Process queue error:', error.message);
    res.status(500).json({ message: 'Error processing queue' });
  }
});

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const cacheKey = 'dashboard-stats';
    const cached = getAnalyticsCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const usersCount = await User.countDocuments({ role: 'student' });
    const threadsCount = await FAQThread.countDocuments({ status: 'active', isMerged: false });
    const verifiedAnswersCount = await Answer.countDocuments({ isVerified: true });
    const pendingApprovalCount = await FAQThread.countDocuments({ status: { $in: ['pending_review', 'flagged'] } }) + 
      await Answer.countDocuments({ 
        $or: [
          { 'aiScores.toxicityScore': { $gte: cfg.TOXICITY_FLAG_THRESHOLD } },
          { 'aiScores.spamProbability': { $gte: cfg.SPAM_FLAG_THRESHOLD } }
        ]
      });
    const rejectedCount = await FAQThread.countDocuments({ status: 'rejected' });

    const topContributors = await User.find({ role: 'student' })
      .sort({ spPoints: -1 })
      .limit(5)
      .select('username spPoints level trustScore contributionRating badges')
      .lean();

    const categoryStats = await FAQThread.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const monthlyActivity = [
      { month: 'Jan', threads: 14, answers: 28 },
      { month: 'Feb', threads: 22, answers: 45 },
      { month: 'Mar', threads: 35, answers: 60 },
      { month: 'Apr', threads: 48, answers: 90 },
      { month: 'May', threads: 65, answers: 120 }
    ];

    const payload = {
      counters: {
        usersCount,
        threadsCount,
        verifiedAnswersCount,
        pendingApprovalCount,
        rejectedCount
      },
      topContributors,
      categoryDistribution: categoryStats,
      monthlyActivity
    };

    setAnalyticsCache(cacheKey, payload, 30 * 1000);
    res.json(payload);
  } catch (error) {
    console.error('Fetch admin stats error:', error.message);
    res.status(500).json({ message: 'Error fetching admin dashboard statistics' });
  }
});

// GET /api/admin/user-activity - Searchable admin activity stream
router.get('/user-activity', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const match = {};
    const dateFilter = buildDateFilter(req.query);

    if (dateFilter) match.createdAt = dateFilter;
    if (req.query.activityType && req.query.activityType !== 'all') {
      match.action = String(req.query.activityType);
    }
    if (req.query.status && req.query.status !== 'all') {
      match['metadata.status'] = String(req.query.status);
    }

    const userMatch = {};
    if (req.query.q) {
      const regex = new RegExp(escapeRegex(req.query.q).slice(0, 120), 'i');
      userMatch.$or = [
        { 'user.username': regex },
        { 'user.email': regex },
        { action: regex },
        { 'metadata.title': regex },
        { 'metadata.query': regex },
        { 'metadata.searchQuery': regex },
        { 'metadata.status': regex }
      ];
    }
    if (req.query.userName) {
      userMatch['user.username'] = new RegExp(escapeRegex(req.query.userName).slice(0, 80), 'i');
    }
    if (req.query.email) {
      userMatch['user.email'] = new RegExp(escapeRegex(req.query.email).slice(0, 120), 'i');
    }

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
    ];
    if (Object.keys(userMatch).length) pipeline.push({ $match: userMatch });
    pipeline.push({
      $facet: {
        rows: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              action: 1,
              metadata: 1,
              createdAt: 1,
              user: {
                _id: '$user._id',
                username: '$user.username',
                email: '$user.email',
                role: '$user.role'
              }
            }
          }
        ],
        totalRows: [{ $count: 'total' }],
        actionCounts: [{ $group: { _id: '$action', count: { $sum: 1 } } }]
      }
    });

    const [result] = await UserActivity.aggregate(pipeline);
    const total = result?.totalRows?.[0]?.total || 0;
    res.json({
      activities: result?.rows || [],
      actionCounts: result?.actionCounts || [],
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin activity fetch error:', error.message);
    res.status(500).json({ message: 'Error fetching user activity' });
  }
});

// ── ANALYTICS ROUTES ──────────────────────────────────────────────────────────

// GET /api/admin/analytics/most-searched - Frequently searched user questions
router.get('/analytics/most-searched', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, parseInt(req.query.days) || 30));
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 15));
    const minResults = req.query.minResults !== undefined ? Math.max(0, parseInt(req.query.minResults) || 0) : null;
    const source = String(req.query.source || 'all');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const midpoint = new Date(since.getTime() + ((Date.now() - since.getTime()) / 2));
    const match = { createdAt: { $gte: since }, query: { $exists: true, $ne: '' } };

    if (source !== 'all') match.source = source;
    if (minResults !== null) match.resultsCount = { $gte: minResults };
    if (req.query.q) {
      match.query = { $regex: escapeRegex(req.query.q).slice(0, 120), $options: 'i' };
    }

    const questions = await SearchLog.aggregate([
      { $match: match },
      {
        $project: {
          normalizedQuery: { $trim: { input: { $toLower: '$query' } } },
          query: 1,
          userId: 1,
          resultsCount: 1,
          source: 1,
          clickedThreadId: 1,
          createdAt: 1
        }
      },
      { $match: { normalizedQuery: { $ne: '' } } },
      {
        $group: {
          _id: '$normalizedQuery',
          query: { $first: '$query' },
          count: { $sum: 1 },
          recentCount: { $sum: { $cond: [{ $gte: ['$createdAt', midpoint] }, 1, 0] } },
          previousCount: { $sum: { $cond: [{ $lt: ['$createdAt', midpoint] }, 1, 0] } },
          uniqueUsers: { $addToSet: '$userId' },
          avgResults: { $avg: '$resultsCount' },
          sources: { $addToSet: '$source' },
          clickedThreads: { $addToSet: '$clickedThreadId' },
          lastSearchedAt: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1, lastSearchedAt: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          query: 1,
          normalizedQuery: '$_id',
          count: 1,
          recentCount: 1,
          previousCount: 1,
          trend: {
            $switch: {
              branches: [
                { case: { $gt: ['$recentCount', '$previousCount'] }, then: 'up' },
                { case: { $lt: ['$recentCount', '$previousCount'] }, then: 'down' }
              ],
              default: 'flat'
            }
          },
          trendDelta: { $subtract: ['$recentCount', '$previousCount'] },
          uniqueUserCount: { $size: { $filter: { input: '$uniqueUsers', as: 'id', cond: { $ne: ['$$id', null] } } } },
          avgResults: { $round: ['$avgResults', 1] },
          sources: 1,
          clickCount: { $size: { $filter: { input: '$clickedThreads', as: 'id', cond: { $ne: ['$$id', null] } } } },
          lastSearchedAt: 1
        }
      }
    ]);

    res.json({ questions, filters: { days, source, minResults, q: req.query.q || '' } });
  } catch (error) {
    console.error('Most searched analytics error:', error.message);
    res.status(500).json({ message: 'Error fetching most searched questions' });
  }
});

// GET /api/admin/analytics/user-activity — User activity summary
router.get('/analytics/user-activity', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days) || 7);
    const cacheKey = `analytics:user-activity:${days}`;
    const cached = getAnalyticsCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // Action breakdown
    const actionBreakdown = await UserActivity.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    // Daily active users trend
    const dailyActive = await UserActivity.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { 
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        uniqueUsers: { $addToSet: '$userId' },
        totalActions: { $sum: 1 }
      } },
      { $project: { date: '$_id', userCount: { $size: '$uniqueUsers' }, totalActions: 1, _id: 0 } },
      { $sort: { date: 1 } }
    ]);
    // Top active users
    const topActiveUsers = await UserActivity.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$userId', actionCount: { $sum: 1 } } },
      { $sort: { actionCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { userId: '$_id', username: '$user.username', actionCount: 1, _id: 0 } }
    ]);
    // Total bookmarks & upvotes in period
    const engagementCounts = await UserActivity.aggregate([
      { $match: { createdAt: { $gte: since }, action: { $in: ['bookmark', 'upvote'] } } },
      { $count: 'total' }
    ]);
    const payload = { actionBreakdown, dailyActive, topActiveUsers, totalEngagements: engagementCounts[0]?.total || 0 };
    setAnalyticsCache(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user activity analytics' });
  }
});

// GET /api/admin/analytics/feedback — Feedback & sentiment analysis
router.get('/analytics/feedback', async (req, res) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const cacheKey = `analytics:feedback:${limit}`;
    const cached = getAnalyticsCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    // Rating distribution
    const ratingDistribution = await Feedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    // Sentiment breakdown
    const sentimentBreakdown = await Feedback.aggregate([
      { $group: { _id: '$sentiment', count: { $sum: 1 } } }
    ]);
    // Average rating
    const avgRatingResult = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    // Recent feedback with thread & answer context
    const recentFeedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('answerId threadId userId rating comment sentiment createdAt')
      .populate('answerId', 'body')
      .populate('threadId', 'title')
      .lean();
    // Low-rated answers (1-2 stars) needing attention
    const lowRatedFeedback = await Feedback.find({ rating: { $lte: 2 } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('answerId threadId userId rating comment sentiment createdAt')
      .populate('answerId', 'body')
      .populate('threadId', 'title')
      .lean();
    const payload = { 
      ratingDistribution, 
      sentimentBreakdown, 
      avgRating: avgRatingResult[0]?.avgRating || 0,
      recentFeedback, 
      lowRatedFeedback 
    };
    setAnalyticsCache(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feedback analytics' });
  }
});

// GET /api/admin/analytics/trending — Trending topics based on search & view activity
router.get('/analytics/trending', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days) || 7);
    const cacheKey = `analytics:trending:${days}`;
    const cached = getAnalyticsCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // Top threads by view activity
    const trendingByViews = await UserActivity.aggregate([
      { $match: { createdAt: { $gte: since }, action: 'view_thread' } },
      { $group: { _id: '$metadata.threadId', viewCount: { $sum: 1 } } },
      { $sort: { viewCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'faqthreads', localField: '_id', foreignField: '_id', as: 'thread' } },
      { $unwind: '$thread' },
      { $project: { threadId: '$_id', title: '$thread.title', category: '$thread.category', viewCount: 1, _id: 0 } }
    ]);
    // Top threads by search clicks
    const trendingBySearch = await SearchLog.aggregate([
      { $match: { clickedThreadId: { $ne: null }, createdAt: { $gte: since } } },
      { $group: { _id: '$clickedThreadId', clickCount: { $sum: 1 } } },
      { $sort: { clickCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'faqthreads', localField: '_id', foreignField: '_id', as: 'thread' } },
      { $unwind: '$thread' },
      { $project: { threadId: '$_id', title: '$thread.title', category: '$thread.category', clickCount: 1, _id: 0 } }
    ]);
    // Rising queries (queries with increasing frequency)
    const allSearches = await SearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $toLower: '$query' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const payload = { trendingByViews, trendingBySearch, risingQueries: allSearches };
    setAnalyticsCache(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trending analytics' });
  }
});

// GET /api/admin/analytics/system-performance — System performance & health
router.get('/analytics/system-performance', async (req, res) => {
  try {
    const cacheKey = 'analytics:system-performance';
    const cached = getAnalyticsCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    // Current metrics snapshot
    const latestMetrics = await SystemMetrics.findOne().sort({ timestamp: -1 }).lean();
    // Recent uptime history (last 24h)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uptimeHistory = await SystemMetrics.find({ timestamp: { $gte: since24h } })
      .sort({ timestamp: 1 })
      .select('timestamp activeUsers avgResponseTimeMs errorRate uptimePercent')
      .lean();
    // DB stats
    const dbStats = {
      totalUsers: await User.countDocuments(),
      totalThreads: await FAQThread.countDocuments({ status: 'active' }),
      totalAnswers: await Answer.countDocuments(),
      totalBookmarks: await Bookmark.countDocuments(),
      totalSearchLogs: await SearchLog.countDocuments()
    };
    // Error rate trend
    const errorTrend = await SystemMetrics.find({ timestamp: { $gte: since24h } })
      .sort({ timestamp: 1 })
      .select('timestamp errorRate')
      .lean();
    // Response time trend
    const responseTrend = await SystemMetrics.find({ timestamp: { $gte: since24h } })
      .sort({ timestamp: 1 })
      .select('timestamp avgResponseTimeMs')
      .lean();
    const payload = { latestMetrics, uptimeHistory, dbStats, errorTrend, responseTrend };
    setAnalyticsCache(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system performance metrics' });
  }
});

// POST /api/admin/analytics/log-search — Log a search query (called by frontend)
router.post('/analytics/log-search', async (req, res) => {
  try {
    const { query, resultsCount, clickedThreadId, source } = req.body;
    // Search logging to database disabled as per request
    res.json({ message: 'Search logging disabled' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging search' });
  }
});

// POST /api/admin/analytics/log-activity — Log a user action (called by frontend)
router.post('/analytics/log-activity', async (req, res) => {
  try {
    const { action, metadata } = req.body;
    if (action === 'login' || action === 'search') {
      return res.json({ message: 'Login/Search logging disabled' });
    }
    await UserActivity.create({
      userId: req.user?.id,
      action,
      metadata: metadata || {}
    });
    clearAnalyticsCache();
    res.json({ message: 'Activity logged' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging activity' });
  }
});

// GET /api/admin/rejected-list - List all rejected questions
router.get('/rejected-list', async (req, res) => {
  try {
    const rejectedThreads = await FAQThread.find({ status: 'rejected' })
      .sort({ reviewedAt: -1, updatedAt: -1 })
      .select('title body category author authorName status rejectionReason rejectionPenaltyPoints reviewedAt updatedAt createdAt')
      .populate('author', 'username email')
      .lean();
    res.json(rejectedThreads);
  } catch (error) {
    console.error('Fetch rejected list error:', error.message);
    res.status(500).json({ message: 'Error retrieving rejected questions' });
  }
});

module.exports = router;
