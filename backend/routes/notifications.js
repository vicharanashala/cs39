const express = require('express');
const router = express.Router();
const { FAQThread, Answer } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply auth gate to all notification routes
router.use(authMiddleware);

// GET /api/notifications - Dynamically generate notifications on the fly (no database storage)
router.get('/', async (req, res) => {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const notifications = [];

    // 1. Fetch approved questions (active threads authored by user, updated/approved in last 2 days)
    const approvedThreads = await FAQThread.find({
      author: req.user._id,
      status: 'active',
      updatedAt: { $gte: twoDaysAgo }
    }).select('title updatedAt');

    approvedThreads.forEach(thread => {
      notifications.push({
        _id: `thread_approve_${thread._id}`,
        title: '✅ Your Question is Live!',
        message: `Great news! Your question "${thread.title.substring(0, 60)}" has been approved and is now visible in the community FAQ.`,
        type: 'approval',
        createdAt: thread.updatedAt
      });
    });

    // 2. Fetch recently rejected questions (status 'rejected') authored by user within last 2 days
    const rejectedThreads = await FAQThread.find({
      author: req.user._id,
      status: 'rejected',
      updatedAt: { $gte: twoDaysAgo }
    }).select('title updatedAt rejectionReason');

    rejectedThreads.forEach(thread => {
      notifications.push({
        _id: `thread_reject_${thread._id}`,
        title: '❌ Your Question was Rejected',
        message: `Your question "${thread.title.substring(0, 60)}" was not approved. Reason: ${thread.rejectionReason || 'No reason provided.'}`,
        type: 'rejection',
        createdAt: thread.updatedAt
      });
    });

    // 3. Fetch approved/verified answers (verified answers by user, where associated thread was updated/verified in last 2 days)
    const verifiedAnswers = await Answer.find({
      author: req.user._id,
      isVerified: true
    }).populate({
      path: 'threadId',
      match: { updatedAt: { $gte: twoDaysAgo } },
      select: 'title updatedAt'
    });

    verifiedAnswers.forEach(answer => {
      if (answer.threadId) {
        notifications.push({
          _id: `answer_verify_${answer._id}`,
          title: '🏆 Your Answer has been Verified!',
          message: `Congratulations! Your answer on "${answer.threadId.title.substring(0, 60)}" has been verified by the IIT Ropar team.`,
          type: 'verification',
          createdAt: answer.threadId.updatedAt
        });
      }
    });

    // Sort by createdAt descending
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(notifications);
  } catch (error) {
    console.error('Error generating dynamic notifications:', error.message);
    res.status(500).json({ message: 'Error retrieving notifications' });
  }
});

// POST /api/notifications/:id/read - Stub route for marking notification read (client-side tracked)
router.post('/:id/read', (req, res) => {
  res.json({ success: true });
});

// POST /api/notifications/read-all - Stub route for marking all notifications read
router.post('/read-all', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
