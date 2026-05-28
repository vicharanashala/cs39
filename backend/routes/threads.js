const express = require('express');
const router = express.Router();
const { FAQThread, Answer, Comment, User, Notification, SPTransaction } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');
const { checkSemanticSimilarity, scoreContentModeration } = require('../services/aiService');
const { updateReputation } = require('../services/reputation');

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/threads - List threads with filters (category, search, sorting)
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, isOfficial } = req.query;
    let query = { status: 'active', isMerged: false };

    if (category && category !== 'All') {
      query.category = category;
    }
    if (isOfficial === 'true') {
      query.isOfficial = true;
    } else if (isOfficial === 'false') {
      query.isOfficial = false;
    }
    if (search) {
      const safeSearch = escapeRegex(String(search).trim().slice(0, 100));
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { body: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    let sortCriteria = { createdAt: -1 };
    if (sort === 'upvotes') {
      sortCriteria = { 'upvotes.length': -1 };
    } else if (sort === 'meToo') {
      sortCriteria = { 'meToo.length': -1 };
    } else if (sort === 'replies') {
      sortCriteria = { repliesCount: -1 };
    }

    const limit = isOfficial === 'true' ? 250 : 100;
    let threadQuery = FAQThread.find(query).sort(sortCriteria).limit(limit);
    if (isOfficial === 'true') {
      threadQuery = threadQuery.select('title category isOfficial');
    }
    const threads = await threadQuery;
    res.json(threads);
  } catch (error) {
    console.error('Fetch threads error:', error.message);
    res.status(500).json({ message: 'Error retrieving threads' });
  }
});

// POST /api/threads/check-duplicate - Check semantic duplicates as user types
router.post('/check-duplicate', async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || title.trim().length < 5) {
      return res.json([]);
    }
    
    const duplicates = await checkSemanticSimilarity(title, category);
    res.json(duplicates);
  } catch (error) {
    console.error('Check duplicate error:', error.message);
    res.status(500).json({ message: 'Error checking duplicate threads' });
  }
});

// GET /api/threads/:id - Single thread detail
router.get('/:id', async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.id);
    if (!thread || thread.status !== 'active' || thread.isMerged) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    res.json(thread);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving thread detail' });
  }
});

// POST /api/threads/create - Create thread
router.post('/create', authMiddleware, async (req, res) => {
  try {
    let { title, body, category } = req.body;
    if (!body) {
      body = title;
    }
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    title = String(title).trim().slice(0, 180);
    body = String(body).trim().slice(0, 4000);

    // Context-aware Duplicate Prevention
    const duplicates = await checkSemanticSimilarity(title, category);
    if (duplicates.length > 0 && duplicates[0].score >= 0.45) {
      return res.status(400).json({ 
        message: `A very similar question already exists: "${duplicates[0].thread.title}". Please check existing FAQs before posting.` 
      });
    }

    // Run AI Moderation Scoring
    const aiScores = scoreContentModeration(body, title);
    
    let threadStatus = 'active';
    if (aiScores.toxicityScore >= 0.6 || aiScores.spamProbability >= 0.7) {
      threadStatus = 'flagged';
    }

    const newThread = new FAQThread({
      title,
      body,
      category,
      author: req.user._id,
      authorName: req.user.username,
      status: threadStatus,
      aiScores
    });

    await newThread.save();

    if (threadStatus === 'flagged') {
      const notif = new Notification({
        userId: req.user._id,
        title: '⚠️ Thread Flagged for Review',
        message: 'Your thread has been automatically flagged by our AI moderation system and is pending administrator review.',
        type: 'verification'
      });
      await notif.save();
    }

    res.status(201).json(newThread);
  } catch (error) {
    console.error('Create thread error:', error.message);
    res.status(500).json({ message: 'Error creating thread' });
  }
});

// POST /api/threads/:id/upvote - Upvote/un-upvote thread
router.post('/:id/upvote', authMiddleware, async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    // Self voting constraint
    if (thread.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot upvote your own question.' });
    }

    const userIdStr = req.user._id.toString();
    const upvotedIndex = thread.upvotes.findIndex(id => id.toString() === userIdStr);

    if (upvotedIndex > -1) {
      thread.upvotes.splice(upvotedIndex, 1);
    } else {
      thread.upvotes.push(req.user._id);
    }

    await thread.save();
    res.json(thread);
  } catch (error) {
    res.status(500).json({ message: 'Error processing upvote' });
  }
});

// POST /api/threads/:id/metoo - Mark "Me Too"
router.post('/:id/metoo', authMiddleware, async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    // Self meToo constraint
    if (thread.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot mark "Me Too" on your own question.' });
    }

    const userIdStr = req.user._id.toString();
    const index = thread.meToo.findIndex(id => id.toString() === userIdStr);

    if (index > -1) {
      thread.meToo.splice(index, 1);
    } else {
      thread.meToo.push(req.user._id);
    }

    await thread.save();
    res.json(thread);
  } catch (error) {
    res.status(500).json({ message: 'Error processing Me Too toggle' });
  }
});

// GET /api/threads/:id/answers
router.get('/:id/answers', async (req, res) => {
  try {
    const thread = await FAQThread.findOne({ _id: req.params.id, status: 'active', isMerged: false }).select('_id');
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const answers = await Answer.find({ threadId: req.params.id });
    
    const answerList = await Promise.all(answers.map(async (ans) => {
      const authorUser = await User.findById(ans.author);
      const trustScore = authorUser ? authorUser.trustScore : 100;
      return {
        ...ans.toObject(),
        authorTrustScore: trustScore
      };
    }));

    answerList.sort((a, b) => {
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const scoreA = (a.upvotes.length * 5) + (a.authorTrustScore * 0.1) + (a.aiScores.qualityScore * 10);
      const scoreB = (b.upvotes.length * 5) + (b.authorTrustScore * 0.1) + (b.aiScores.qualityScore * 10);
      return scoreB - scoreA;
    });

    res.json(answerList);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching answers' });
  }
});

// POST /api/threads/:id/answers/create - Submit an answer
router.post('/:id/answers/create', authMiddleware, async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    if (thread.status !== 'active' || thread.isMerged) {
      return res.status(400).json({ message: 'Replies are unavailable for this thread' });
    }

    // Block if verified answer exists
    const verifiedAnswer = await Answer.findOne({ threadId: thread._id, isVerified: true });
    if (verifiedAnswer) {
      return res.status(400).json({ message: 'This question already has a verified answer and is locked for further replies.' });
    }

    // Self answer constraint
    if (thread.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot post an answer to your own question.' });
    }

    // Single answer constraint
    const existingAnswer = await Answer.findOne({ threadId: thread._id, author: req.user._id });
    if (existingAnswer) {
      return res.status(400).json({ message: 'You have already submitted an answer to this question. You can edit your existing answer instead.' });
    }

    const { body } = req.body;
    if (!body) return res.status(400).json({ message: 'Answer content is required' });

    // AI moderation scoring
    const aiScores = scoreContentModeration(body);
    let isSpam = aiScores.spamProbability >= 0.7;

    const newAnswer = new Answer({
      threadId: thread._id,
      body,
      author: req.user._id,
      authorName: req.user.username,
      authorRole: req.user.role,
      aiScores
    });

    await newAnswer.save();

    // Increment replies counter on thread
    thread.repliesCount += 1;
    await thread.save();

    if (thread.author.toString() !== req.user._id.toString()) {
      const notif = new Notification({
        userId: thread.author,
        title: '💬 New Answer Received',
        message: `"${req.user.username}" answered your question: "${thread.title.substring(0, 30)}..."`,
        type: 'answer'
      });
      await notif.save();
    }

    // Award +5 SP for student answers (unless moderation flags it as spam)
    if (req.user.role === 'student' && !isSpam) {
      await updateReputation(req.user._id, 5, 'helpful_answer');
    } else if (isSpam) {
      await updateReputation(req.user._id, -5, 'spam_penalty');
    }

    res.status(201).json(newAnswer);
  } catch (error) {
    console.error('Submit answer error:', error.message);
    res.status(500).json({ message: 'Error submitting answer' });
  }
});

// POST /api/threads/answers/:ansId/upvote - Upvote an answer
router.post('/answers/:ansId/upvote', authMiddleware, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.ansId);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    const userIdStr = req.user._id.toString();
    const upvotedIndex = answer.upvotes.findIndex(id => id.toString() === userIdStr);

    if (upvotedIndex > -1) {
      answer.upvotes.splice(upvotedIndex, 1);
    } else {
      answer.upvotes.push(req.user._id);
      
      if (answer.author.toString() !== userIdStr && answer.authorRole === 'student') {
        await updateReputation(answer.author, 1, 'helpful_answer');
      }
    }

    await answer.save();
    res.json(answer);
  } catch (error) {
    res.status(500).json({ message: 'Error processing answer upvote' });
  }
});

// POST /api/threads/answers/:ansId/comments - Comment on a reply
router.post('/answers/:ansId/comments', authMiddleware, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.ansId);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    const { body } = req.body;
    if (!body) return res.status(400).json({ message: 'Comment text is required' });

    const newComment = new Comment({
      answerId: answer._id,
      body,
      author: req.user._id,
      authorName: req.user.username
    });

    await newComment.save();

    if (answer.author.toString() !== req.user._id.toString()) {
      const notif = new Notification({
        userId: answer.author,
        title: '💬 New Comment',
        message: `"${req.user.username}" commented on your answer.`,
        type: 'reply'
      });
      await notif.save();
    }

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// GET /api/threads/answers/:ansId/comments - List comments for an answer
router.get('/answers/:ansId/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ answerId: req.params.ansId }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// PUT /api/threads/:id - Edit thread (Author only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    if (thread.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to edit this question.' });
    }

    // Admin lock constraint
    if (thread.isOfficial) {
      return res.status(400).json({ message: 'This official FAQ is locked by administrators and cannot be edited.' });
    }

    const { title, body, category } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const aiScores = scoreContentModeration(body, title);
    let threadStatus = 'active';
    if (aiScores.toxicityScore >= 0.6 || aiScores.spamProbability >= 0.7) {
      threadStatus = 'flagged';
    }

    thread.title = title;
    thread.body = body;
    thread.category = category || thread.category;
    thread.status = threadStatus;
    thread.aiScores = aiScores;
    thread.updatedAt = Date.now();

    await thread.save();
    res.json(thread);
  } catch (error) {
    console.error('Edit thread error:', error.message);
    res.status(500).json({ message: 'Error editing thread' });
  }
});

// DELETE /api/threads/:id - Delete thread (Author or Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const thread = await FAQThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    if (thread.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to delete this question.' });
    }

    // Admin lock constraint
    if (thread.isOfficial && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'This official FAQ is locked by administrators and cannot be deleted.' });
    }

    const answers = await Answer.find({ threadId: thread._id });
    for (const ans of answers) {
      await Comment.deleteMany({ answerId: ans._id });
    }
    await Answer.deleteMany({ threadId: thread._id });

    await FAQThread.findByIdAndDelete(thread._id);
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Delete thread error:', error.message);
    res.status(500).json({ message: 'Error deleting thread' });
  }
});

// PUT /api/threads/answers/:ansId - Edit answer (Author only)
router.put('/answers/:ansId', authMiddleware, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.ansId);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    if (answer.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to edit this answer.' });
    }

    // Admin lock constraint
    if (answer.isVerified) {
      return res.status(400).json({ message: 'This answer is verified by administrators and cannot be edited.' });
    }

    const { body } = req.body;
    if (!body) return res.status(400).json({ message: 'Answer content is required' });

    const aiScores = scoreContentModeration(body);
    answer.body = body;
    answer.aiScores = aiScores;
    await answer.save();

    res.json(answer);
  } catch (error) {
    console.error('Edit answer error:', error.message);
    res.status(500).json({ message: 'Error editing answer' });
  }
});

// DELETE /api/threads/answers/:ansId - Delete answer (Author or Admin)
router.delete('/answers/:ansId', authMiddleware, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.ansId);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    if (answer.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to delete this answer.' });
    }

    // Admin lock constraint
    if (answer.isVerified && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'This verified answer is locked by administrators and cannot be deleted.' });
    }

    const thread = await FAQThread.findById(answer.threadId);
    if (thread && thread.repliesCount > 0) {
      thread.repliesCount -= 1;
      await thread.save();
    }

    await Comment.deleteMany({ answerId: answer._id });
    await Answer.findByIdAndDelete(answer._id);

    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Delete answer error:', error.message);
    res.status(500).json({ message: 'Error deleting answer' });
  }
});

module.exports = router;
