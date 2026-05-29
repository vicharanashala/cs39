const fs = require('fs');
const path = require('path');
const backendEnvPath = path.join(__dirname, '.env');
require('dotenv').config({
  path: fs.existsSync(backendEnvPath) ? backendEnvPath : path.join(__dirname, '../.env')
});
const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const createRateLimiter = require('./middleware/rateLimit');
const { User, FAQThread, Answer, Comment, SPTransaction, Notification } = require('./models/Schemas');

// Import routes
const authRoutes = require('./routes/auth');
const threadRoutes = require('./routes/threads');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const chatbotRoutes = require('./routes/chatbot');
const notificationRoutes = require('./routes/notifications');
const leaderboardRoutes = require('./routes/leaderboard');
const bookmarkRoutes = require('./routes/bookmarks');
const trackRoutes = require('./routes/track');

const app = express();
const server = http.createServer(app);

// ── Environment & CORS config (must be before Socket.IO uses them) ───────
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function isLocalDevelopmentOrigin(origin) {
  if (isProduction || !origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    return ['http:', 'https:'].includes(protocol)
      && ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch (error) {
    return false;
  }
}

// ── Socket.IO setup ──────────────────────────────────────────────────────
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO: JWT authentication + user rooms
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id || decoded._id;
    socket.userRole = decoded.role || 'student';
    next();
  } catch (err) {
    next();
  }
});

io.on('connection', (socket) => {
  if (socket.userId) {
    socket.join(socket.userId);
    console.log(`[Socket.IO] User ${socket.userId} connected (role: ${socket.userRole})`);
  } else {
    console.log('[Socket.IO] Anonymous client connected');
  }
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected (userId: ${socket.userId || 'anonymous'})`);
  });
});

// Attach io to app so routes can access it
app.set('io', io);

// Give reputation service access to io for real-time SP events
const { setSocketIO } = require('./services/reputation');
setSocketIO(io);

// App environment configurations
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) {
      return callback(null, true);
    }
    console.warn('CORS rejected origin:', origin);
    return callback(new Error(`Origin ${origin} not permitted by CORS policy`));
  },
  credentials: true
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api', createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Too many API requests. Please slow down.'
}));

app.get('/api/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'unavailable',
    database: dbReady ? 'connected' : 'disconnected'
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/track', trackRoutes);

// Database Seeding Logic
const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Seeding] Database already has data. Skipping seed.');
      return;
    }

    console.log('[Seeding] Seeding default records...');

    const salt = await bcrypt.genSalt(10);
    const studentPassword = await bcrypt.hash('student123', salt);
    const adminPassword = await bcrypt.hash('admin123', salt);

    // 1. Seed Users
    const admin = new User({
      username: 'Admin_Ropar',
      email: 'admin@iitr.ac.in',
      password: adminPassword,
      role: 'admin',
      spPoints: 0,
      level: 1,
      trustScore: 100,
      badges: ['Staff Administrator']
    });
    await admin.save();

    const sanjay = new User({
      username: 'Sanjay_Kumar',
      email: 'sanjay@iitr.ac.in',
      password: studentPassword,
      role: 'student',
      spPoints: 240,
      level: 3,
      trustScore: 100,
      contributionRating: 'Rising Star',
      helpfulAnswersCount: 8,
      verifiedAnswersCount: 2,
      faqContributionsCount: 1,
      badges: ['Campus Rookie', 'Community Helper']
    });
    await sanjay.save();

    const priya = new User({
      username: 'Priya_Sharma',
      email: 'priya@iitr.ac.in',
      password: studentPassword,
      role: 'student',
      spPoints: 410,
      level: 5,
      trustScore: 100,
      contributionRating: 'Champion',
      helpfulAnswersCount: 12,
      verifiedAnswersCount: 4,
      faqContributionsCount: 2,
      badges: ['Campus Rookie', 'Verified Expert', 'Community Helper', 'FAQ Architect']
    });
    await priya.save();

    const ankit = new User({
      username: 'Ankit_Verma',
      email: 'ankit@iitr.ac.in',
      password: studentPassword,
      role: 'student',
      spPoints: 45,
      level: 1,
      trustScore: 100,
      contributionRating: 'Novice',
      helpfulAnswersCount: 2,
      verifiedAnswersCount: 0,
      faqContributionsCount: 0,
      badges: ['Campus Rookie']
    });
    await ankit.save();

    // 2. Seed FAQ Threads
    const thread1 = new FAQThread({
      title: 'Summer Internship 2026 Portal Opening Date',
      body: 'Does anyone know when the IIT Ropar summer internship application portal opens for third-year CS undergraduates? Are there any specific GPA requirements or resume guidelines we need to follow?',
      category: 'Internship',
      author: sanjay._id,
      authorName: sanjay.username,
      upvotes: [priya._id, ankit._id],
      meToo: [priya._id],
      isOfficial: true,
      repliesCount: 1,
      aiScores: { spamProbability: 0.05, toxicityScore: 0.0, relevanceScore: 1.0, confidenceScore: 0.95, qualityScore: 0.8 }
    });
    await thread1.save();

    const thread2 = new FAQThread({
      title: 'How to download the Bonafide Certificate template?',
      body: 'I need a Bonafide Certificate to submit for my industrial internship training clearance. Where can I find the official template on the IIT Ropar portal, and who is the signing authority?',
      category: 'Certificates',
      author: priya._id,
      authorName: priya.username,
      upvotes: [sanjay._id],
      meToo: [ankit._id],
      isOfficial: true,
      repliesCount: 1,
      aiScores: { spamProbability: 0.02, toxicityScore: 0.0, relevanceScore: 1.0, confidenceScore: 0.98, qualityScore: 0.9 }
    });
    await thread2.save();

    const thread3 = new FAQThread({
      title: 'Minimum attendance requirements for CS301 lab course',
      body: 'I missed two labs due to medical reasons. What is the minimum attendance required to prevent getting a grade drop or being barred from the final exams? Do medical certificates waive the attendance percentage?',
      category: 'Attendance',
      author: ankit._id,
      authorName: ankit.username,
      upvotes: [sanjay._id],
      meToo: [],
      isOfficial: false,
      repliesCount: 1,
      aiScores: { spamProbability: 0.08, toxicityScore: 0.1, relevanceScore: 0.95, confidenceScore: 0.85, qualityScore: 0.65 }
    });
    await thread3.save();

    const thread4 = new FAQThread({
      title: 'IIT Ropar Hostel WiFi connection issue (IITR-Internal)',
      body: 'I cannot connect to the hostel WiFi on my Linux laptop. It keeps prompt for authentication. Does anyone have the correct proxy server configuration settings for IIT Ropar LAN?',
      category: 'Technical Issues',
      author: sanjay._id,
      authorName: sanjay.username,
      upvotes: [priya._id],
      meToo: [ankit._id, priya._id],
      isOfficial: false,
      repliesCount: 0,
      aiScores: { spamProbability: 0.15, toxicityScore: 0.05, relevanceScore: 0.9, confidenceScore: 0.82, qualityScore: 0.72 }
    });
    await thread4.save();

    // 3. Seed Answers
    const ans1 = new Answer({
      threadId: thread1._id,
      body: 'The IIT Ropar summer internship portal is scheduled to open on September 15th, 2026. The minimum GPA requirement for CSE students is 7.5. For resume formatting, please refer to the standard CDC guidelines folder on the intranet.',
      author: admin._id,
      authorName: admin.username,
      authorRole: 'admin',
      isVerified: true,
      isPinned: true,
      upvotes: [sanjay._id, priya._id],
      aiScores: { toxicityScore: 0.0, spamProbability: 0.01, qualityScore: 0.95 }
    });
    await ans1.save();

    const ans2 = new Answer({
      threadId: thread2._id,
      body: 'You can download the template from the Academics Section under the "Downloads" tab on the main IIT Ropar portal. The Assistant Registrar (Academics) is the signing authority for clearance forms.',
      author: priya._id,
      authorName: priya.username,
      authorRole: 'student',
      isVerified: true,
      isPinned: true,
      upvotes: [sanjay._id, ankit._id],
      aiScores: { toxicityScore: 0.0, spamProbability: 0.02, qualityScore: 0.88 }
    });
    await ans2.save();

    const ans3 = new Answer({
      threadId: thread3._id,
      body: 'The minimum attendance requirement is 75%. If you missed labs due to medical reasons, please submit a medical certificate verified by the IIT Ropar Medical Center to the department office within 7 days of recovery to obtain a waiver.',
      author: admin._id,
      authorName: admin.username,
      authorRole: 'admin',
      isVerified: true,
      isPinned: true,
      upvotes: [ankit._id],
      aiScores: { toxicityScore: 0.0, spamProbability: 0.01, qualityScore: 0.92 }
    });
    await ans3.save();

    // 4. Seed SP Transactions for activity timeline graphs
    const txs = [
      { userId: priya._id, pointsChange: 25, reason: 'verified_answer', timestamp: new Date(Date.now() - 86400000 * 3) },
      { userId: priya._id, pointsChange: 15, reason: 'helpful_answer', timestamp: new Date(Date.now() - 86400000 * 2) },
      { userId: priya._id, pointsChange: 10, reason: 'official_faq', timestamp: new Date(Date.now() - 86400000 * 1) },
      { userId: sanjay._id, pointsChange: 25, reason: 'verified_answer', timestamp: new Date(Date.now() - 86400000 * 4) },
      { userId: sanjay._id, pointsChange: 10, reason: 'official_faq', timestamp: new Date(Date.now() - 86400000 * 2) }
    ];
    await SPTransaction.insertMany(txs);

    // 5. Seed Notifications
    const notification = new Notification({
      userId: priya._id,
      title: '🏆 Answer Verified!',
      message: 'Your answer on "Bonafide Certificate download" was verified by the IIT Ropar Team! +25 SP earned.',
      type: 'verification'
    });
    await notification.save();

    const notification2 = new Notification({
      userId: sanjay._id,
      title: '✨ Reputation Earned!',
      message: 'Your answer on internship portals received 3 helpful upvotes. +15 SP earned.',
      type: 'sp_change'
    });
    await notification2.save();

    console.log('[Seeding] Database seeding completed successfully.');
  } catch (err) {
    console.error('[Seeding Error] Failed to seed default data:', err.message);
  }
};

const ensureDemoAccounts = async () => {
  const salt = await bcrypt.genSalt(10);
  const studentPassword = await bcrypt.hash('student123', salt);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const accounts = [
    {
      username: 'Admin_Ropar',
      email: 'admin@iitr.ac.in',
      password: adminPassword,
      role: 'admin',
      spPoints: 0,
      level: 1,
      trustScore: 100,
      badges: ['Staff Administrator']
    },
    {
      username: 'Sanjay_Kumar',
      email: 'sanjay@iitr.ac.in',
      password: studentPassword,
      role: 'student',
      spPoints: 240,
      level: 3,
      trustScore: 100,
      contributionRating: 'Rising Star',
      badges: ['Campus Rookie', 'Community Helper']
    },
    {
      username: 'Priya_Sharma',
      email: 'priya@iitr.ac.in',
      password: studentPassword,
      role: 'student',
      spPoints: 410,
      level: 5,
      trustScore: 100,
      contributionRating: 'Champion',
      badges: ['Campus Rookie', 'Verified Expert', 'Community Helper', 'FAQ Architect']
    }
  ];

  for (const account of accounts) {
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      existing.password = account.password;
      existing.role = account.role;
      await existing.save();
      continue;
    }
    await User.create(account);
  }

  console.log('[Seeding] Local demo login accounts are ready.');
};

// Connect to Database and start server
const PORT = process.env.PORT || 5000;
const seedOfficialFAQs = require('./seedFAQs');
function validateConfiguration() {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (isProduction && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

if (isProduction) {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});
app.use((error, req, res, next) => {
  if (error.message.includes('not permitted by CORS policy')) {
    return res.status(403).json({ message: error.message });
  }
  console.error(`[Request Error] ${error.message}`);
  res.status(500).json({ message: 'Internal Server Error' });
});

async function startServer() {
  validateConfiguration();
  await connectDB();

  // Only seed the real MongoDB database if Mongoose has successfully connected
  let faqSeedEnabled = false;
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const demoSeedEnabled = process.env.ENABLE_DEMO_SEED === 'true'
      || (!isProduction && process.env.ENABLE_DEMO_SEED !== 'false');
    faqSeedEnabled = process.env.ENABLE_FAQ_SEED === 'true'
      || (!isProduction && process.env.ENABLE_FAQ_SEED !== 'false');

    if (demoSeedEnabled) {
      await ensureDemoAccounts();
    }
  }

  server.listen(PORT, () => {
    console.log(`[Server] Express + Socket.IO backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    if (faqSeedEnabled) {
      seedOfficialFAQs();
    }
  });
}

startServer().catch(error => {
  console.error(`[Startup Error] ${error.message}`);
  process.exit(1);
});
