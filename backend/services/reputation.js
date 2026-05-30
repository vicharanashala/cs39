const { User, SPTransaction, Notification } = require('../models/Schemas');

// Injected from server.js after io is created
let _io = null;

/**
 * Allow server.js to pass the io instance once it's created.
 * Called from server.js after `io = new Server(...)`.
 */
function setSocketIO(io) {
  _io = io;
}

/**
 * Adjusts user reputation (SP) points, logs transaction, triggers level-ups and badges.
 * @param {string} userId - User to reward/penalize
 * @param {number} pointsChange - SP amount (+5, -5, +10, etc)
 * @param {string} reason - Action tag ('verified_answer', 'toxic_penalty', 'official_faq', etc)
 */
async function updateReputation(userId, pointsChange, reason) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const oldLevel = user.level;

    // Apply change
    user.spPoints = Math.max(0, user.spPoints + pointsChange);
    
    // Recalculate Level: 100 SP per level
    user.level = Math.floor(user.spPoints / 100) + 1;
    
    // Update stats counters
    if (reason === 'verified_answer') {
      user.verifiedAnswersCount += 1;
      user.helpfulAnswersCount += 1;
    } else if (reason === 'helpful_answer') {
      user.helpfulAnswersCount += 1;
    } else if (reason === 'official_faq') {
      user.faqContributionsCount += 1;
    } else if (reason === 'toxic_penalty' || reason === 'spam_penalty') {
      user.penaltiesCount += 1;
      user.trustScore = Math.max(0, user.trustScore - 15);
    }

    // Recalculate Contribution Rating Title
    if (user.spPoints >= 1000) {
      user.contributionRating = 'Legend';
    } else if (user.spPoints >= 500) {
      user.contributionRating = 'Champion';
    } else if (user.spPoints >= 100) {
      user.contributionRating = 'Rising Star';
    } else {
      user.contributionRating = 'Novice';
    }

    // Badge Check Logic
    const unlockedBadges = [];
    const checkAwardBadge = (badgeName) => {
      if (!user.badges.includes(badgeName)) {
        user.badges.push(badgeName);
        unlockedBadges.push(badgeName);
      }
    };

    if (user.verifiedAnswersCount >= 1) {
      checkAwardBadge('Verified Expert');
    }
    if (user.helpfulAnswersCount >= 5) {
      checkAwardBadge('Community Helper');
    }
    if (user.faqContributionsCount >= 3) {
      checkAwardBadge('FAQ Architect');
    }
    if (user.level >= 5) {
      checkAwardBadge('Community Pillar');
    }
    if (user.spPoints >= 1000) {
      checkAwardBadge('Legendary Contributor');
    }

    await user.save();

    // Emit real-time SP event to the user's socket room
    if (_io) {
      const eventName = pointsChange >= 0 ? 'sp_gained' : 'sp_lost';
      _io.to(user._id.toString()).emit(eventName, {
        pointsChange,
        reason,
        newTotal: user.spPoints,
        level: user.level
      });
    }

    // Log the transaction
    const tx = new SPTransaction({
      userId: user._id,
      pointsChange,
      reason
    });
    await tx.save();

    // Save Notification
    let actionText = pointsChange >= 0 ? `gained ${pointsChange} SP` : `lost ${Math.abs(pointsChange)} SP`;
    let reasonText = '';
    switch (reason) {
      case 'verified_answer': reasonText = 'having an answer verified by admins'; break;
      case 'helpful_answer': reasonText = 'receiving helpful upvotes'; break;
      case 'official_faq': reasonText = 'your thread becoming an official FAQ'; break;
      case 'toxic_penalty': reasonText = 'violating toxicity guidelines'; break;
      case 'spam_penalty': reasonText = 'being flagged for spam'; break;
      default: reasonText = 'reputation updates';
    }

    const notifMessage = `You ${actionText} for ${reasonText}.`;
    const notif = new Notification({
      userId: user._id,
      title: pointsChange >= 0 ? '✨ Reputation Earned!' : '⚠️ Reputation Penalty',
      message: notifMessage,
      type: 'sp_change'
    });
    await notif.save();

    if (user.level > oldLevel) {
      const levelUpNotif = new Notification({
        userId: user._id,
        title: '🎉 Level Up!',
        message: `Congratulations! You reached Level ${user.level}!`,
        type: 'sp_change'
      });
      await levelUpNotif.save();
    }

    unlockedBadges.forEach(async (badge) => {
      const badgeNotif = new Notification({
        userId: user._id,
        title: '🏆 Badge Unlocked!',
        message: `You earned the "${badge}" badge!`,
        type: 'verification'
      });
      await badgeNotif.save();
    });

    return {
      user,
      levelUp: user.level > oldLevel,
      newBadges: unlockedBadges
    };
  } catch (error) {
    console.error('Reputation update error:', error.message);
    return null;
  }
}

module.exports = {
  updateReputation,
  setSocketIO
};
