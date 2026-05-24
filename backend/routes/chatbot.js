const express = require('express');
const router = express.Router();
const { retrieveRAGResponse, scoreContentModeration, classifyQueryCategory } = require('../services/aiService');
const { FAQThread } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');

// POST /api/chatbot/query - Chatbot query endpoint
router.post('/query', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Query cannot be empty' });
    }

    const result = await retrieveRAGResponse(query);
    
    // If chatbot cannot answer confidently (confidence < 35 or suggestThread is true)
    if (result.confidence < 35 || result.suggestThread) {
      const classifiedCategory = classifyQueryCategory(query);
      const aiScores = scoreContentModeration(query, query);
      
      const newThread = new FAQThread({
        title: query,
        body: query,
        category: classifiedCategory,
        author: req.user._id,
        authorName: req.user.username,
        status: 'active',
        aiScores
      });
      await newThread.save();

      const answerText = `I couldn't find a matching FAQ in my database. I have instantly created a new question for you in the community under the category: **"${classifiedCategory}"** with the title: **"${query}"**.\n\nAdmins and other students can now see and answer this question!`;

      return res.json({
        answer: answerText,
        confidence: result.confidence,
        threadId: newThread._id,
        category: classifiedCategory,
        threadCreated: true
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Chatbot route error:', error.message);
    res.status(500).json({ message: 'Error processing chatbot query' });
  }
});

module.exports = router;
