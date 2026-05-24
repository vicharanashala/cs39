const express = require('express');
const router = express.Router();
const { FAQThread, Answer, User, Notification, SPTransaction, Comment } = require('../models/Schemas');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { updateReputation } = require('../services/reputation');

// Apply admin guard to all routes in this file
router.use(authMiddleware);
router.use(requireRole('admin'));

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
    await thread.save();

    // 4. Award reputation points to question author & answer author
    const qAuthorSpNum = parseInt(questionAuthorSp, 10) || 0;
    const aAuthorSpNum = parseInt(answerAuthorSp, 10) || 0;

    if (qAuthorSpNum > 0) {
      await updateReputation(thread.author, qAuthorSpNum, 'official_faq');
    }
    if (aAuthorSpNum > 0) {
      await updateReputation(answer.author, aAuthorSpNum, 'verified_answer');
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
    await thread.save();

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
        { 'aiScores.toxicityScore': { $gte: 0.5 } },
        { 'aiScores.spamProbability': { $gte: 0.5 } }
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
    const { itemId, itemType, action } = req.body;
    let item;

    if (itemType === 'thread') {
      item = await FAQThread.findById(itemId);
      if (!item) return res.status(404).json({ message: 'Thread not found' });

      if (action === 'approve') {
        item.status = 'active';
        await item.save();
      } else if (action === 'delete') {
        item.status = 'spam';
        await item.save();
        await updateReputation(item.author, -5, 'toxic_penalty');
      }
    } else {
      item = await Answer.findById(itemId);
      if (!item) return res.status(404).json({ message: 'Answer not found' });

      if (action === 'approve') {
        item.aiScores.toxicityScore = 0;
        item.aiScores.spamProbability = 0;
        await item.save();
      } else if (action === 'delete') {
        await Answer.findByIdAndDelete(itemId);
        await updateReputation(item.author, -5, 'toxic_penalty');
      }
    }

    res.json({ message: `Item moderated: ${action}` });
  } catch (error) {
    console.error('Moderate action error:', error.message);
    res.status(500).json({ message: 'Error performing moderation action' });
  }
});

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const usersCount = await User.countDocuments({ role: 'student' });
    const threadsCount = await FAQThread.countDocuments({ status: 'active', isMerged: false });
    const verifiedAnswersCount = await Answer.countDocuments({ isVerified: true });
    const pendingApprovalCount = await FAQThread.countDocuments({ status: 'flagged' }) + 
      await Answer.countDocuments({ 
        $or: [
          { 'aiScores.toxicityScore': { $gte: 0.5 } },
          { 'aiScores.spamProbability': { $gte: 0.5 } }
        ]
      });

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
        pendingApprovalCount
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

module.exports = router;
