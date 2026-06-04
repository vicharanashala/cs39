const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, UserActivity } = require('../models/Schemas');
const { authMiddleware } = require('../middleware/authMiddleware');
const createRateLimiter = require('../middleware/rateLimit');

const JWT_SECRET = process.env.JWT_SECRET;
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many authentication attempts. Please try again later.'
});

router.use(authLimiter);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (username.length < 3 || username.length > 40 || !email || password.length < 8) {
      return res.status(400).json({ message: 'Provide a valid email, username, and password of at least 8 characters' });
    }
    
    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'student'
    });

    // Award initial badges
    newUser.badges.push('Campus Rookie');

    await newUser.save();

    // Create token
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        spPoints: newUser.spPoints,
        level: newUser.level,
        trustScore: newUser.trustScore,
        contributionRating: newUser.contributionRating,
        badges: newUser.badges
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    // Login activity logging disabled as per request

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        spPoints: user.spPoints,
        level: user.level,
        trustScore: user.trustScore,
        contributionRating: user.contributionRating,
        badges: user.badges
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/auth/forgot-password (Simulated)
router.post('/forgot-password', async (req, res) => {
  try {
    // Keep the response non-enumerating until a mail-backed reset flow is configured.
    res.json({ message: 'If an account exists, a password reset link will be sent' });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/auth/google (Mock Google Login Placeholder)
router.post('/google', (req, res) => {
  res.status(501).json({ message: 'Google sign-in is unavailable until verified OAuth is configured' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
