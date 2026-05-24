const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 1. USER SCHEMA
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  
  // Gamification & SP Reputation System
  spPoints: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  trustScore: { type: Number, default: 100 }, 
  contributionRating: { type: String, default: 'Novice' }, 
  helpfulAnswersCount: { type: Number, default: 0 },
  verifiedAnswersCount: { type: Number, default: 0 },
  faqContributionsCount: { type: Number, default: 0 },
  penaltiesCount: { type: Number, default: 0 },
  badges: [{ type: String }],
  
  createdAt: { type: Date, default: Date.now }
});

// 2. FAQ THREAD SCHEMA
const FAQThreadSchema = new Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  category: { 
    type: String, 
    enum: [
      'Internship', 'Selection Process', 'Certificates', 'Attendance', 
      'Assignments', 'Mentorship', 'Projects', 'Deadlines', 
      'Technical Issues', 'Payments', 'General Queries', 'Announcements', 'Others'
    ],
    default: 'General Queries' 
  },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  meToo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  isOfficial: { type: Boolean, default: false }, 
  isMerged: { type: Boolean, default: false },
  mergedInto: { type: Schema.Types.ObjectId, ref: 'FAQThread', default: null },
  
  status: { type: String, enum: ['active', 'flagged', 'merged', 'spam'], default: 'active' },
  
  // AI Moderation Scoring Mock Metrics
  aiScores: {
    spamProbability: { type: Number, default: 0 },
    toxicityScore: { type: Number, default: 0 },
    relevanceScore: { type: Number, default: 1.0 },
    confidenceScore: { type: Number, default: 1.0 },
    qualityScore: { type: Number, default: 0.5 }
  },
  
  repliesCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 3. ANSWER SCHEMA
const AnswerSchema = new Schema({
  threadId: { type: Schema.Types.ObjectId, ref: 'FAQThread', required: true },
  body: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, enum: ['student', 'admin'], default: 'student' },
  
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isVerified: { type: Boolean, default: false }, 
  isPinned: { type: Boolean, default: false },
  
  aiScores: {
    toxicityScore: { type: Number, default: 0 },
    spamProbability: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 0.5 }
  },
  
  createdAt: { type: Date, default: Date.now }
});

// 4. COMMENT SCHEMA
const CommentSchema = new Schema({
  answerId: { type: Schema.Types.ObjectId, ref: 'Answer', required: true },
  body: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// 5. NOTIFICATION SCHEMA
const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['answer', 'sp_change', 'verification', 'reply', 'announcement', 'merge'], 
    required: true 
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// 6. SP TRANSACTION SCHEMA
const SPTransactionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pointsChange: { type: Number, required: true }, 
  reason: { type: String, required: true },      
  timestamp: { type: Date, default: Date.now }
});

// 7. MODERATION LOG SCHEMA
const ModerationLogSchema = new Schema({
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['thread', 'answer'], required: true },
  contentSnippet: { type: String, required: true },
  aiScores: {
    toxicityScore: { type: Number, default: 0 },
    spamProbability: { type: Number, default: 0 }
  },
  status: { type: String, enum: ['flagged', 'approved', 'removed'], default: 'flagged' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null }
});

module.exports = {
  User: mongoose.model('User', UserSchema),
  FAQThread: mongoose.model('FAQThread', FAQThreadSchema),
  Answer: mongoose.model('Answer', AnswerSchema),
  Comment: mongoose.model('Comment', CommentSchema),
  Notification: mongoose.model('Notification', NotificationSchema),
  SPTransaction: mongoose.model('SPTransaction', SPTransactionSchema),
  ModerationLog: mongoose.model('ModerationLog', ModerationLogSchema)
};
