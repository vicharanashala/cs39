// routes/track.js — Live FAQ Tracking System
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { FAQTracker, FAQThread, User } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getQueuePosition } = require('../services/queueService');

// ── Status Definitions ────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { status: 'received',       label: 'Question Received',  icon: '📥', color: '#6366f1', bgColor: 'bg-indigo-500' },
  { status: 'ai_analyzing',   label: 'AI Analyzing',       icon: '🤖', color: '#8b5cf6', bgColor: 'bg-violet-500' },
  { status: 'expert_review',  label: 'Expert Reviewing',   icon: '👨‍💼', color: '#f59e0b', bgColor: 'bg-amber-500' },
  { status: 'verified',       label: 'Answer Verified',    icon: '✅', color: '#10b981', bgColor: 'bg-emerald-500' },
  { status: 'completed',      label: 'Solution Completed',  icon: '🎉', color: '#14b8a6', bgColor: 'bg-teal-500' }
];

// ── GET /api/track/:threadId — get tracker for a thread ───────────────────────
router.get('/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const thread = await FAQThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    if (thread.status !== 'active') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || (String(thread.author) !== String(user._id) && user.role !== 'admin')) {
          return res.status(403).json({ message: 'Access denied.' });
        }
      } catch (err) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    let tracker = await FAQTracker.findOne({ threadId });

    if (!tracker) {
      // Auto-create tracker on first access (question just submitted)
      tracker = await FAQTracker.create({
        threadId,
        status: 'received',
        steps: [{ status: 'received', label: 'Question Received', timestamp: new Date() }]
      });

      // Emit socket event for real-time UI update
      const io = req.app.get('io');
      if (io) {
        io.emit('faq_status_update', { threadId, status: 'received', tracker });
      }
    }

    const queuePosition = await getQueuePosition(threadId);

    res.json({ tracker, steps: STATUS_STEPS, queuePosition });
  } catch (error) {
    console.error('Tracker fetch error:', error.message);
    res.status(500).json({ message: 'Error fetching tracker status' });
  }
});

// ── POST /api/track — create tracker for a thread ─────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.body;
    if (!threadId) return res.status(400).json({ message: 'threadId required' });

    const existing = await FAQTracker.findOne({ threadId });
    if (existing) return res.json({ tracker: existing, steps: STATUS_STEPS });

    const tracker = await FAQTracker.create({
      threadId,
      status: 'received',
      steps: [{ status: 'received', label: 'Question Received', timestamp: new Date() }]
    });

    const io = req.app.get('io');
    if (io) io.emit('faq_status_update', { threadId, status: 'received', tracker });

    res.json({ tracker, steps: STATUS_STEPS });
  } catch (error) {
    res.status(500).json({ message: 'Error creating tracker' });
  }
});

// ── PUT /api/track/:threadId/status — advance status ────────────────────────
router.put('/:threadId/status', authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { status, note } = req.body;

    if (!status || !STATUS_STEPS.find(s => s.status === status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    let tracker = await FAQTracker.findOne({ threadId });
    if (!tracker) {
      tracker = await FAQTracker.create({
        threadId,
        status,
        steps: [{ status, label: STATUS_STEPS.find(s => s.status === status).label, timestamp: new Date(), note: note || '' }]
      });
    } else {
      // Validate forward progression (can't go backwards)
      const currentIdx = STATUS_STEPS.findIndex(s => s.status === tracker.status);
      const nextIdx = STATUS_STEPS.findIndex(s => s.status === status);
      if (nextIdx < currentIdx) {
        return res.status(400).json({ message: 'Cannot revert status. Forward progression only.' });
      }

      const ts = new Date();
      const stepInfo = STATUS_STEPS.find(s => s.status === status);
      STATUS_STEPS.slice(0, nextIdx + 1).forEach(step => {
        if (!tracker.steps.find(existing => existing.status === step.status)) {
          tracker.steps.push({
            status: step.status,
            label: step.label,
            timestamp: ts,
            note: step.status === status ? (note || '') : ''
          });
        }
      });
      tracker.status = status;
      tracker.updatedAt = ts;
      if (status === 'completed') tracker.completedAt = ts;
      await tracker.save();
    }

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('faq_status_update', {
        threadId,
        status: tracker.status,
        steps: tracker.steps,
        completedAt: tracker.completedAt
      });
    }

    res.json({ tracker, steps: STATUS_STEPS });
  } catch (error) {
    console.error('Tracker update error:', error.message);
    res.status(500).json({ message: 'Error updating tracker status' });
  }
});

// ── PUT /api/track/:threadId/ai-analysis — store AI analysis results ───────────
router.put('/:threadId/ai-analysis', authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { summary, confidence, tags, priority } = req.body;

    let tracker = await FAQTracker.findOne({ threadId });
    if (!tracker) {
      tracker = await FAQTracker.create({
        threadId,
        status: 'ai_analyzing',
        steps: [
          { status: 'received', label: 'Question Received', timestamp: new Date() },
          { status: 'ai_analyzing', label: 'AI Analyzing', timestamp: new Date() }
        ]
      });
    } else {
      // Add AI analyzing step if not present
      if (!tracker.steps.find(s => s.status === 'ai_analyzing')) {
        tracker.steps.push({ status: 'ai_analyzing', label: 'AI Analyzing', timestamp: new Date() });
      }
      tracker.status = 'ai_analyzing';
      tracker.updatedAt = new Date();
    }

    tracker.aiAnalysis = { summary, confidence, tags, priority };
    await tracker.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('faq_status_update', { threadId, status: 'ai_analyzing', tracker });
    }

    res.json({ tracker });
  } catch (error) {
    res.status(500).json({ message: 'Error storing AI analysis' });
  }
});

// ── GET /api/track — list all active trackers (admin) ─────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const trackers = await FAQTracker.find(filter)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .populate('threadId', 'title category authorName faqNumber');

    res.json({ trackers, steps: STATUS_STEPS });
  } catch (error) {
    res.status(500).json({ message: 'Error listing trackers' });
  }
});

// ── GET /api/track/stats — aggregate tracker stats ───────────────────────────
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const counts = {};
    for (const step of STATUS_STEPS) {
      counts[step.status] = await FAQTracker.countDocuments({ status: step.status });
    }
    const total = await FAQTracker.countDocuments();
    const completedCount = await FAQTracker.countDocuments({ status: 'completed' });

    res.json({
      counts,
      total,
      completedCount,
      avgResolutionTimeMs: null, // could compute if we tracked timestamps
      steps: STATUS_STEPS
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tracker stats' });
  }
});

module.exports = router;
module.exports.STATUS_STEPS = STATUS_STEPS;
