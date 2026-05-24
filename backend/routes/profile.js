const express = require('express');
const router = express.Router();
const { FAQThread, Answer, User, SPTransaction } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const user = await User.findById(targetUserId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Raised questions (FAQ threads authored by user)
    const rawRaisedThreads = await FAQThread.find({ author: targetUserId, status: { $ne: 'spam' } });
    const raisedThreads = await Promise.all(rawRaisedThreads.map(async (thread) => {
      const answers = await Answer.find({ threadId: thread._id });
      return {
        ...thread.toObject(),
        answers
      };
    }));

    // 2. Answers given by user
    const answersGiven = await Answer.find({ author: targetUserId });
    
    // Find answer thread IDs to query their details
    const answerThreadIds = answersGiven.map(ans => ans.threadId);
    const threadsAnswered = await FAQThread.find({ _id: { $in: answerThreadIds } });

    // 3. Resolved questions (user's threads that have at least one verified answer)
    const raisedThreadIds = rawRaisedThreads.map(t => t._id);
    const verifiedAnswersForUserThreads = await Answer.find({ threadId: { $in: raisedThreadIds }, isVerified: true });
    const resolvedThreadIds = verifiedAnswersForUserThreads.map(ans => ans.threadId.toString());
    const resolvedQuestions = rawRaisedThreads.filter(t => resolvedThreadIds.includes(t._id.toString()));

    // 4. Upvoted questions
    const upvotedQuestions = await FAQThread.find({ upvotes: targetUserId, status: { $ne: 'spam' } });

    // 5. Activity timeline (SP transactions list)
    const activityTimeline = await SPTransaction.find({ userId: targetUserId }).sort({ timestamp: -1 });

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
          ...ans.toObject(),
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
          ...ans.toObject(),
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
