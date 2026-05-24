const express = require('express');
const router = express.Router();
const { User } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { filter } = req.query; // 'daily' | 'weekly' | 'monthly' | 'all-time'
    
    // In a production app, you would filter by transaction timestamps.
    // For this prototype, we'll fetch users sorted by SP points, but apply some mock variances 
    // to simulate different filters and make the board change realistically!
    let users = await User.find({ role: 'student' })
      .select('username spPoints level trustScore contributionRating badges verifiedAnswersCount helpfulAnswersCount')
      .sort({ spPoints: -1 });

    // Simulate different leaderboard views by injecting slight variation factors
    let leaderboardData = users.map((user, idx) => {
      let score = user.spPoints;
      if (filter === 'daily') {
        score = Math.max(0, Math.floor(score * 0.05) + (idx === 1 ? 15 : idx === 3 ? 10 : 0));
      } else if (filter === 'weekly') {
        score = Math.max(0, Math.floor(score * 0.2) + (idx === 0 ? 30 : idx === 2 ? 25 : 5));
      } else if (filter === 'monthly') {
        score = Math.max(0, Math.floor(score * 0.65) + (idx === 1 ? 50 : 10));
      }
      return {
        _id: user._id,
        username: user.username,
        level: user.level,
        contributionRating: user.contributionRating,
        badges: user.badges,
        spPoints: score
      };
    });

    // Re-sort because of score variance injections
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
