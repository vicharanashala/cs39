const express = require('express');
const router = express.Router();
const { Bookmark, FAQThread } = require('../models/Schemas');

const { authMiddleware } = require('../middleware/authMiddleware');

// GET /api/bookmarks — get all bookmarks for current user (populated thread)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'threadId',
        match: { status: { $ne: 'spam' } },
        select: 'title body category isOfficial faqNumber faqSortKey upvotes repliesCount createdAt'
      });

    // Filter out null threadId (spam/removed threads)
    const valid = bookmarks.filter(b => b.threadId);
    res.json(valid.map(b => ({
      _id: b._id,
      threadId: b.threadId._id,
      title: b.threadId.title,
      body: b.threadId.body,
      category: b.threadId.category,
      isOfficial: b.threadId.isOfficial,
      faqNumber: b.threadId.faqNumber,
      faqSortKey: b.threadId.faqSortKey,
      bookmarkedAt: b.createdAt
    })));
  } catch (err) {
    console.error('[Bookmarks] GET error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/bookmarks/toggle — toggle bookmark on/off for a thread
router.post('/toggle', authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.body;
    if (!threadId) return res.status(400).json({ message: 'threadId required' });

    // Verify thread exists
    const thread = await FAQThread.findById(threadId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const existing = await Bookmark.findOne({ userId: req.user.id, threadId });
    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      return res.json({ bookmarked: false, threadId });
    } else {
      const bookmark = await Bookmark.create({ userId: req.user.id, threadId });
      return res.json({ bookmarked: true, bookmarkId: bookmark._id, threadId });
    }
  } catch (err) {
    console.error('[Bookmarks] Toggle error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/bookmarks/:threadId — remove a specific bookmark
router.delete('/:threadId', authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.params;
    await Bookmark.deleteOne({ userId: req.user.id, threadId });
    res.json({ removed: true, threadId });
  } catch (err) {
    console.error('[Bookmarks] DELETE error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;