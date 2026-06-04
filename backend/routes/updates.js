const express = require('express');
const router = express.Router();
const { FAQChangeLog, UserActivity } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const updates = await FAQChangeLog.find({ isPublished: true })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(40)
      .populate('threadId', 'title category faqNumber isOfficial')
      .lean();

    res.json(updates.map((update) => ({
      ...update,
      hasViewed: update.viewedBy?.some((id) => String(id) === String(req.user._id)) || false,
      viewedBy: undefined
    })));
  } catch (error) {
    console.error('Fetch updates error:', error.message);
    res.status(500).json({ message: 'Error fetching FAQ updates' });
  }
});

router.get('/unread', async (req, res) => {
  try {
    const updates = await FAQChangeLog.find({
      isPublished: true,
      viewedBy: { $ne: req.user._id }
    })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(6)
      .populate('threadId', 'title category faqNumber isOfficial')
      .lean();

    res.json(updates.map((update) => ({ ...update, viewedBy: undefined })));
  } catch (error) {
    console.error('Fetch unread updates error:', error.message);
    res.status(500).json({ message: 'Error fetching unread updates' });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    const update = await FAQChangeLog.findById(req.params.id);
    if (!update) return res.status(404).json({ message: 'Update not found' });

    const alreadyViewed = update.viewedBy.some((id) => String(id) === String(req.user._id));
    if (!alreadyViewed) {
      update.viewedBy.push(req.user._id);
      update.metrics.views += 1;
      update.updatedAt = new Date();
      await update.save();
    }

    await UserActivity.create({
      userId: req.user._id,
      action: 'view_update',
      metadata: { updateId: update._id, threadId: update.threadId, changeType: update.changeType }
    }).catch(() => {});

    res.json({ message: 'Update marked as read', update });
  } catch (error) {
    console.error('Mark update viewed error:', error.message);
    res.status(500).json({ message: 'Error marking update as viewed' });
  }
});

router.post('/:id/metric', async (req, res) => {
  try {
    const metric = req.body.metric;
    if (!['explores', 'bookmarks'].includes(metric)) {
      return res.status(400).json({ message: 'Unsupported metric' });
    }

    const update = await FAQChangeLog.findById(req.params.id);
    if (!update) return res.status(404).json({ message: 'Update not found' });
    update.metrics[metric] += 1;
    update.updatedAt = new Date();
    await update.save();
    res.json({ message: 'Metric recorded' });
  } catch (error) {
    console.error('Update metric error:', error.message);
    res.status(500).json({ message: 'Error recording update metric' });
  }
});

module.exports = router;
