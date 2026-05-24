const express = require('express');
const router = express.Router();
const { Notification } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply auth gate to all notification routes
router.use(authMiddleware);

// GET /api/notifications - Get all user notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving notifications' });
  }
});

// POST /api/notifications/:id/read - Mark single notification as read
router.post('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification status' });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

module.exports = router;
