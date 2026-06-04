const express = require('express');
const router = express.Router();
const { FAQThread, Answer, User, SPTransaction } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getQueuePosition } = require('../services/queueService');

// GET /api/profile/:userId/sp-history - Paginated SP transaction history
router.get('/:userId/sp-history', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const total = await SPTransaction.countDocuments({ userId: req.params.userId });
    const transactions = await SPTransaction.find({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('SP history error:', error.message);
    res.status(500).json({ message: 'Error retrieving SP history' });
  }
});

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const user = await User.findById(targetUserId).select('username email role spPoints level trustScore contributionRating helpfulAnswersCount verifiedAnswersCount faqContributionsCount penaltiesCount badges createdAt').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Raised questions (FAQ threads authored by user)
    const mayViewPrivate = req.user.role === 'admin' || req.user._id.toString() === targetUserId;
    // Determine which thread statuses are visible to the requester.
    // Students should not see 'rejected' threads; admins can view all non-spam threads.
    const visibleStatus = mayViewPrivate ? { $nin: ['spam', 'rejected'] } : 'active';
    const rawRaisedThreads = await FAQThread.find({ author: targetUserId, status: visibleStatus })
      .select('title body category author authorName status upvotes meToo isOfficial faqNumber faqSortKey repliesCount createdAt updatedAt reviewedAt reviewedBy rejectionReason rejectionPenaltyPoints priority tags')
      .lean();
    const raisedThreadIds = rawRaisedThreads.map(thread => thread._id);
    const [raisedAnswers, raisedQueuePositions] = await Promise.all([
      raisedThreadIds.length
        ? Answer.find({ threadId: { $in: raisedThreadIds } })
          .select('threadId body author authorName authorRole upvotes isVerified isPinned aiScores createdAt updatedAt')
          .lean()
        : Promise.resolve([]),
      Promise.all(rawRaisedThreads.map(async (thread) => [String(thread._id), await getQueuePosition(thread._id)]))
    ]);

    const answersByThreadId = raisedAnswers.reduce((acc, answer) => {
      const key = String(answer.threadId);
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push(answer);
      return acc;
    }, new Map());
    const queuePositionByThreadId = new Map(raisedQueuePositions);
    const raisedThreads = rawRaisedThreads.map((thread) => ({
      ...thread,
      answers: answersByThreadId.get(String(thread._id)) || [],
      queuePosition: queuePositionByThreadId.get(String(thread._id)) || null
    }));

    // 2. Answers given by user
    const answersGiven = await Answer.find({ author: targetUserId })
      .select('threadId body author authorName authorRole upvotes isVerified isPinned aiScores createdAt updatedAt')
      .lean();
    
    // Find answer thread IDs to query their details (exclude rejected threads for student view)
    const answerThreadIds = answersGiven.map(ans => ans.threadId);
    const threadsAnswered = await FAQThread.find({ _id: { $in: answerThreadIds }, status: { $ne: 'rejected' } })
      .select('title status')
      .lean();
    
    // 2. Answers given by userstions (user's threads that have at least one verified answer)
    const verifiedAnswersForUserThreads = raisedThreadIds.length
      ? await Answer.find({ threadId: { $in: raisedThreadIds }, isVerified: true })
        .select('threadId')
        .lean()
      : [];
    const resolvedThreadIds = verifiedAnswersForUserThreads.map(ans => ans.threadId.toString());
    const resolvedQuestions = rawRaisedThreads.filter(t => resolvedThreadIds.includes(t._id.toString()));

    // 4. Upvoted questions
    const upvotedQuestions = await FAQThread.find({ upvotes: targetUserId, status: 'active' })
      .select('title body category author authorName isOfficial faqNumber faqSortKey createdAt updatedAt')
      .lean();

    // 5. Activity timeline (SP transactions list)
    const activityTimeline = await SPTransaction.find({ userId: targetUserId })
      .sort({ timestamp: -1 })
      .select('userId pointsChange reason timestamp')
      .lean();

    // 6. Calculate FAQ contribution score (verified answers * 15 + helpful upvotes * 5 + official FAQs * 25)
    const faqContributionScore = (user.verifiedAnswersCount * 15) + (user.helpfulAnswersCount * 5) + (user.faqContributionsCount * 25);

    // Mock progress metric for Course completion % (IIT Ropar Internship Modules)
    const courseCompletionRate = 85; 

    // Aggregate monthly data for LeetCode-style activity map
    // We group transactions by date to show a calendar layout on the frontend
    const contributionMap = {};
    activityTimeline.forEach(tx => {
      const dateStr = tx.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      contributionMap[dateStr] = (contributionMap[dateStr] || 0) + 1;
    });

    const solvedAnswers = answersGiven
      .filter(ans => ans.isVerified === true)
      .map(ans => {
        const matchingThread = threadsAnswered.find(t => t._id.toString() === ans.threadId.toString());
        return {
          ...ans,
          threadTitle: matchingThread ? matchingThread.title : 'Deleted Thread'
        };
      });

    res.json({
      user,
      stats: {
        raisedCount: raisedThreads.length,
        resolvedCount: resolvedQuestions.length,
        answersCount: answersGiven.length,
        upvotedCount: upvotedQuestions.length,
        faqContributionScore,
        courseCompletionRate,
        contributionMap
      },
      raisedThreads,
      resolvedQuestions,
      upvotedQuestions,
      solvedAnswers,
      answersGiven: answersGiven.map(ans => {
        const matchingThread = threadsAnswered.find(t => t._id.toString() === ans.threadId.toString());
        return {
          ...ans,
          threadTitle: matchingThread ? matchingThread.title : 'Deleted Thread'
        };
      }),
      activityTimeline
    });
  } catch (error) {
    console.error('Fetch profile stats error:', error.message);
    res.status(500).json({ message: 'Error retrieving user profile statistics' });
  }
});

module.exports = router;
