const express = require('express');
const router = express.Router();
const { retrieveRAGResponse } = require('../services/aiService');
const { authMiddleware } = require('../middleware/authMiddleware');
const createRateLimiter = require('../middleware/rateLimit');

router.use(createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many chatbot requests. Please wait a moment.'
}));

// POST /api/chatbot/query - Chatbot query endpoint
router.post('/query', authMiddleware, async (req, res) => {
  try {
    const query = String(req.body.query || '').trim();
    if (!query) {
      return res.status(400).json({ message: 'Query cannot be empty' });
    }
    if (query.length > 500) {
      return res.status(400).json({ message: 'Query must be 500 characters or fewer' });
    }

    const result = await retrieveRAGResponse(query);
    res.json(result);
  } catch (error) {
    console.error('Chatbot route error:', error.message);
    res.status(500).json({ message: 'Error processing chatbot query' });
  }
});

module.exports = router;
