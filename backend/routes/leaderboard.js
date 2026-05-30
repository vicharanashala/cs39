const express = require('express');
const router = express.Router();
const { User, SPTransaction } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { filter = 'all-time' } = req.query; // 'daily' | 'weekly' | 'monthly' | 'all-time'

    // Compute real SP earned within the time window using SPTransaction records
    let timeFilter = {};
    const now = new Date();
    if (filter === 'daily') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      timeFilter = { timestamp: { $gte: startOfDay } };
    } else if (filter === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      timeFilter = { timestamp: { $gte: startOfWeek } };
    } else if (filter === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      timeFilter = { timestamp: { $gte: startOfMonth } };
    }
    // 'all-time' → no time filter (empty object returns all docs)

    // Aggregate real SP totals per user within the time window
    const spAggregates = await SPTransaction.aggregate([
      { $match: timeFilter },
      { $group: { _id: '$userId', periodSp: { $sum: '$pointsChange' } } }
    ]);

    const spMap = new Map(spAggregates.map(a => [a._id.toString(), a.periodSp]));

    // Fetch all student users and enrich with real period SP
    const users = await User.find({ role: 'student' })
      .select('username spPoints level trustScore contributionRating badges verifiedAnswersCount helpfulAnswersCount')
      .sort({ spPoints: -1 });

    const leaderboardData = users.map(user => {
      const periodSp = spMap.get(user._id.toString()) || 0;
      const displaySp = filter === 'all-time' ? user.spPoints : periodSp;
      return {
        _id: user._id,
        username: user.username,
        level: user.level,
        contributionRating: user.contributionRating,
        badges: user.badges,
        spPoints: Math.max(0, displaySp),
        periodSp: filter !== 'all-time' ? periodSp : undefined
      };
    });

    // Sort by the relevant SP for the period
    leaderboardData.sort((a, b) => b.spPoints - a.spPoints);

    // Dynamic Weekly Missions Tracker based on current user's state
    const currentUser = req.user;
    const weeklyMissions = [
      {
        id: 'mission_1',
        title: 'Share the Knowledge',
        description: 'Publish 2 new FAQ threads in any category',
        progress: Math.min(100, Math.round(((currentUser.faqContributionsCount || 0) / 2) * 100)),
        current: currentUser.faqContributionsCount || 0,
        target: 2,
        reward: '+15 SP',
        completed: (currentUser.faqContributionsCount || 0) >= 2
      },
      {
        id: 'mission_2',
        title: 'Elite Contributor',
        description: 'Get an answer verified by the IIT Ropar Team',
        progress: currentUser.verifiedAnswersCount >= 1 ? 100 : 0,
        current: currentUser.verifiedAnswersCount || 0,
        target: 1,
        reward: '+25 SP & Expert Badge',
        completed: currentUser.verifiedAnswersCount >= 1
      },
      {
        id: 'mission_3',
        title: 'Reputation Climb',
        description: 'Earn a total of 150 SP Points',
        progress: Math.min(100, Math.round((currentUser.spPoints / 150) * 100)),
        current: currentUser.spPoints,
        target: 150,
        reward: '+20 SP',
        completed: currentUser.spPoints >= 150
      },
      {
        id: 'mission_4',
        title: 'Chatbot Consult',
        description: 'Interact with the AI Assistant chatbot',
        progress: 100, // Pre-completed in demo or toggled upon interaction
        current: 1,
        target: 1,
        reward: '+5 SP',
        completed: true
      }
    ];

    res.json({
      leaderboard: leaderboardData,
      weeklyMissions
    });
  } catch (error) {
    console.error('Fetch leaderboard stats error:', error.message);
    res.status(500).json({ message: 'Error retrieving leaderboard' });
  }
});

module.exports = router;
