const express = require('express');
const router = express.Router();
const { FAQThread, Answer, User, Notification, SPTransaction, Comment, SearchLog, UserActivity, Feedback, SystemMetrics, Bookmark, FAQTracker } = require('../models/Schemas');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { updateReputation } = require('../services/reputation');
const { analyzeFAQ, scoreContentModeration } = require('../services/aiService');
const cfg = require('../config');
const { broadcastQueueUpdate } = require('../services/queueService');

// Apply admin guard to all routes in this file
router.use(authMiddleware);
router.use(requireRole('admin'));

// GET /api/admin/moderation-queue - User-submitted FAQs awaiting publication
router.get('/moderation-queue', async (req, res) => {
  try {
    const rawQueue = await FAQThread.find({
      status: { $in: ['pending_review', 'flagged'] },
      isMerged: false
    })
      .sort({ submittedForReviewAt: 1, createdAt: 1 })
      .populate('author', 'username email spPoints trustScore');

    const { getQueuePosition } = require('../services/queueService');
    const queue = await Promise.all(rawQueue.map(async (thread) => {
      const pos = await getQueuePosition(thread._id);
      const tObj = thread.toObject();
      tObj.queuePosition = pos;
      return tObj;
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
        io.to(`user_${thread.author}`).emit('notification', notif);
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
        threadId: thread._id, status: 'verified',
        steps: Object.keys(STATUS_MAP).map(s => ({ status: s, label: STATUS_MAP[s], timestamp: ts }))
      });
    } else if (tracker.status !== 'verified') {
      tracker.steps.push({ status: 'verified', label: 'Answer Verified', timestamp: new Date() });
      tracker.status = 'verified';
      tracker.updatedAt = new Date();
      await tracker.save();
    }

    // Emit real-time events — get io here, inside scope
    const io = req.app.get('io');
    if (io) {
      io.emit('faq_status_update', { threadId: thread._id.toString(), status: 'verified', steps: tracker.steps });
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

    thread.isOfficial = true;
    thread.updatedAt = new Date();
    await thread.save();

    // Broadcast queue updates to all clients
    try { broadcastQueueUpdate(req.app.get('io')); } catch (e) {}

    const authorUser = await User.findById(thread.author);
    if (authorUser && authorUser.role === 'student') {
      await updateReputation(thread.author, 10, 'official_faq');
    }

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
    const flaggedThreads = await FAQThread.find({ status: 'flagged' });
    const flaggedAnswers = await Answer.find({
      $or: [
        { 'aiScores.toxicityScore': { $gte: cfg.TOXICITY_FLAG_THRESHOLD } },
        { 'aiScores.spamProbability': { $gte: cfg.SPAM_FLAG_THRESHOLD } }
      ]
    });

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
          req.app.get('io').to(`user_${item.author}`).emit('notification', notif);
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
          req.app.get('io').to(`user_${item.author}`).emit('notification', notif);
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
          req.app.get('io').to(`user_${item.author}`).emit('notification', notif);
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
          req.app.get('io').to(`user_${item.author}`).emit('notification', notif);
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
        req.app.get('io').to(`user_${thread.author}`).emit('notification', notif);
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
        req.app.get('io').to(`user_${thread.author}`).emit('notification', notif);
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
      .select('username spPoints level trustScore contributionRating badges');

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

    res.json({
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
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error.message);
    res.status(500).json({ message: 'Error fetching admin dashboard statistics' });
  }
});

// ── ANALYTICS ROUTES ──────────────────────────────────────────────────────────

// GET /api/admin/analytics/most-searched — Top searched FAQ queries
router.get('/analytics/most-searched', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    // Aggregate searches by normalized query text
    const topSearches = await SearchLog.aggregate([
      { $group: { _id: { $toLower: '$query' }, count: { $sum: 1 }, queries: { $push: '$query' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { query: '$_id', count: 1, _id: 0 } }
    ]);
    // Also get top clicked threads from search logs
    const topClicked = await SearchLog.aggregate([
      { $match: { clickedThreadId: { $ne: null } } },
      { $group: { _id: '$clickedThreadId', clickCount: { $sum: 1 } } },
      { $sort: { clickCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'faqthreads', localField: '_id', foreignField: '_id', as: 'thread' } },
      { $unwind: '$thread' },
      { $project: { threadId: '$_id', title: '$thread.title', clickCount: 1, _id: 0 } }
    ]);
    res.json({ topSearches, topClicked });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching most searched FAQs' });
  }
});

// GET /api/admin/analytics/user-activity — User activity summary
router.get('/analytics/user-activity', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
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
    res.json({ actionBreakdown, dailyActive, topActiveUsers, totalEngagements: engagementCounts[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user activity analytics' });
  }
});

// GET /api/admin/analytics/feedback — Feedback & sentiment analysis
router.get('/analytics/feedback', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
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
      .populate('answerId', 'body')
      .populate('threadId', 'title');
    // Low-rated answers (1-2 stars) needing attention
    const lowRatedFeedback = await Feedback.find({ rating: { $lte: 2 } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('answerId', 'body')
      .populate('threadId', 'title');
    res.json({ 
      ratingDistribution, 
      sentimentBreakdown, 
      avgRating: avgRatingResult[0]?.avgRating || 0,
      recentFeedback, 
      lowRatedFeedback 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feedback analytics' });
  }
});

// GET /api/admin/analytics/trending — Trending topics based on search & view activity
router.get('/analytics/trending', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
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
    res.json({ trendingByViews, trendingBySearch, risingQueries: allSearches });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trending analytics' });
  }
});

// GET /api/admin/analytics/system-performance — System performance & health
router.get('/analytics/system-performance', async (req, res) => {
  try {
    // Current metrics snapshot
    const latestMetrics = await SystemMetrics.findOne().sort({ timestamp: -1 });
    // Recent uptime history (last 24h)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uptimeHistory = await SystemMetrics.find({ timestamp: { $gte: since24h } })
      .sort({ timestamp: 1 })
      .select('timestamp activeUsers avgResponseTimeMs errorRate uptimePercent');
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
      .select('timestamp errorRate');
    // Response time trend
    const responseTrend = await SystemMetrics.find({ timestamp: { $gte: since24h } })
      .sort({ timestamp: 1 })
      .select('timestamp avgResponseTimeMs');
    res.json({ latestMetrics, uptimeHistory, dbStats, errorTrend, responseTrend });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system performance metrics' });
  }
});

// POST /api/admin/analytics/log-search — Log a search query (called by frontend)
router.post('/analytics/log-search', async (req, res) => {
  try {
    const { query, resultsCount, clickedThreadId, source } = req.body;
    await SearchLog.create({
      query: query?.trim(),
      userId: req.user?.id || null,
      resultsCount: resultsCount || 0,
      clickedThreadId: clickedThreadId || null,
      source: source || 'faq_feed'
    });
    res.json({ message: 'Search logged' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging search' });
  }
});

// POST /api/admin/analytics/log-activity — Log a user action (called by frontend)
router.post('/analytics/log-activity', async (req, res) => {
  try {
    const { action, metadata } = req.body;
    await UserActivity.create({
      userId: req.user?.id,
      action,
      metadata: metadata || {}
    });
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
      .populate('author', 'username email');
    res.json(rejectedThreads);
  } catch (error) {
    console.error('Fetch rejected list error:', error.message);
    res.status(500).json({ message: 'Error retrieving rejected questions' });
  }
});

module.exports = router;
