# Project Context — VINS/Vicharanashala FAQ Platform

## Overview
Full-stack FAQ platform for IIT Ropar internship program. Node.js/Express backend + React frontend.

---

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Lucide icons, recharts
- **Backend**: Express.js, MongoDB (Atlas), JWT auth
- **Real-time**: Socket.IO (server-side io emitter)
- **AI**: Wit.ai TTS, custom paraphrase/analysis AI service

---

## Project Structure
```
C:\Users\Lenovo\Desktop\Prototype\Prototype_update\
├── backend/
│   ├── server.js           # Express + Socket.IO + MongoDB
│   ├── config.js            # All backend constants (ports, thresholds, flags)
│   ├── models/Schemas.js    # All MongoDB schemas
│   ├── routes/
│   │   ├── threads.js       # FAQ CRUD + search + paraphrase + queue
│   │   ├── admin.js         # Admin panel + analytics endpoints + queue mgmt
│   │   ├── auth.js          # Login/signup
│   │   └── ...
│   └── services/
│       ├── aiService.js     # paraphraseQuery(), analyzeFAQ()
│       └── reputation.js    # SP point system
├── frontend/src/
│   ├── config.js            # All frontend constants (ports, thresholds, flags)
│   ├── App.jsx              # Main app + routing
│   ├── pages/
│   │   ├── FAQFeed.jsx      # Main FAQ listing + search + Ask Question
│   │   ├── ThreadDetail.jsx  # Thread + answers + comments
│   │   ├── Dashboard.jsx     # Admin + student dashboard
│   │   ├── Analytics.jsx    # Analytics 6-tab panel (admin)
│   │   └── Profile.jsx
│   └── components/
│       ├── Navbar.jsx
│       ├── TTSButton.jsx    # Wit.ai + browser fallback TTS
│       └── FloatingChatbot.jsx
├── backend/.env              # PORT, MONGODB_URI, JWT_SECRET, thresholds
└── frontend/.env             # VITE_API_URL, VITE_API_PROXY_TARGET, VITE_DEV_HOST
```

### Constants — Where to Edit
| What | Where to change |
|------|----------------|
| Backend port | `backend/.env` → `PORT=5000` |
| MongoDB URI | `backend/.env` → `MONGODB_URI=...` |
| JWT secret | `backend/.env` → `JWT_SECRET=...` |
| AI similarity threshold (duplicate blocking) | `backend/.env` → `SIMILARITY_THRESHOLD=0.45` |
| Toxicity/spam flag thresholds | `backend/config.js` → `TOXICITY_FLAG_THRESHOLD` / `SPAM_FLAG_THRESHOLD` |
| Rate limit (req/min) | `backend/config.js` → `RATE_LIMIT_MAX_REQUESTS` |
| Frontend API URL (production) | `frontend/.env` → `VITE_API_URL=https://...` |
| Backend proxy target (dev) | `frontend/.env` → `VITE_API_PROXY_TARGET=http://localhost:5000` |
| Dev server host | `frontend/.env` → `VITE_DEV_HOST=localhost` |

---

## Key Files & What They Do

### Backend
| File | Purpose |
|------|---------|
| `models/Schemas.js` | User, FAQThread, Answer, Comment, Notification, SPTransaction, Bookmark, SearchLog, UserActivity, Feedback, SystemMetrics, ModerationLog |
| `routes/threads.js` | CRUD for threads, search with paraphrase, answer management |
| `routes/admin.js` | Admin verify/merge/pin, + 6 analytics endpoints + log-search/log-activity |
| `services/aiService.js` | `paraphraseQuery(query)` — 3-strategy paraphrase, max 3 results; `analyzeFAQ(title,body)` — auto-analysis on create/edit |

### Frontend
| File | Purpose |
|------|---------|
| `FAQFeed.jsx` | Official/Saved/Trending tabs, upvote/downvote feedback on community questions, expand answer with TTS button, bookmark/save star icon, Ask Question modal |
| `ThreadDetail.jsx` | Full thread view, answers, comments, upvotes, admin verify, AI analysis panel |
| `Analytics.jsx` | 6-tab admin analytics — Overview, Most Searched, User Activity, Feedback, Trending, System |
| `TTSButton.jsx` | Reusable TTS component — Wit.ai API (POST JSON, voice=wit$Rebecca) or browser SpeechSynthesis fallback |

---

## Key State Variables (Frontend)
- `activeTab` — 'feed' | 'dashboard' | 'admin' | 'analytics' | 'profile'
- `selectedThreadId` — used by ThreadDetail for answer view
- `expandedThreadId` — which thread answer is expanded in FAQFeed
- `mode` — 'official' | 'saved' | 'trending'
- `userVotes` — local vote tracking: `{ threadId: 'up' | 'down' | null }`
- TTS: `ttsKey`, `ttsStatus`, `ttsText`, `voices`, `selectedVoice`
- Bookmarks: `bookmarks` array (threadIds), `toggleBookmark(threadId)` from AppContext

---

## Live FAQ Tracking System
### Concept
Track each FAQ thread through a lifecycle: `received` → `ai_analyzing` → `expert_review` → `verified` → `completed`

### Backend
- New `FAQTracker` schema (or field on FAQThread) tracking: `trackingId`, `threadId`, `status`, `steps[]`, `currentStep`, `updatedAt`
- `GET /api/track/:threadId` — get current status
- `PUT /api/track/:threadId/status` — update status (called internally or by admin)
- Socket.IO event `faq_status_update` emitted on status change

### Frontend
- `LiveFAQTracker` component — shows horizontal stepper with current status highlighted
- Subscribes to Socket.IO for real-time updates
- Attached to ThreadDetail or FAQFeed when a thread is actively being processed

---

## TTS Configuration
- Wit.ai key stored in `localStorage` as `WIT_API_KEY`
- Correct endpoint: `POST https://api.wit.ai/synthesize`
- Correct body: `{ q: text, voice: "wit$Rebecca" }`
- Header: `WitAI-Version: 20240304`
- Voice format: `wit$VoiceName` (NOT locale codes like en-US)
- Browser fallback: `window.speechSynthesis`

---

## Important Patterns
- All API calls use `import api from '../utils/api'` (axios instance with JWT interceptor)
- Auth: JWT stored in `localStorage.token`, added via axios interceptor
- Dark mode: `theme` state in AppContext, toggled via `toggleTheme()`
- Bookmarks: stored as array of threadIds in AppContext, synced via `/bookmarks` endpoint

---

## Admin Credentials
- Admin: `admin` / `admin123`
- Seed users available on server start

---

## Socket.IO Events (server → client)
- `answer_verified` — answer was verified by admin
- `notification` — general notification
- `faq_status_update` — live tracker status changed

---

## Live FAQ Tracking System
### Concept
Track each FAQ thread through a lifecycle: `received` → `ai_analyzing` → `expert_review` → `verified` → `completed`

### Backend Files
- `routes/track.js` — Tracker API routes (GET, POST, PUT status, PUT ai-analysis, stats)
- `models/Schemas.js` — `FAQTracker` schema with `threadId`, `status`, `steps[]`, `aiAnalysis`, `completedAt`
- `routes/admin.js` — Auto-advances tracker to `verified` on answer verification
- `routes/threads.js` — Auto-creates `received` tracker on new thread creation

### Tracker Steps (mirrored in frontend `LiveFAQTracker.jsx`)
| Status | Label | Icon |
|--------|-------|------|
| `received` | Question Received | 📥 |
| `ai_analyzing` | AI Analyzing | 🤖 |
| `expert_review` | Expert Reviewing | 👨‍💼 |
| `verified` | Answer Verified | ✅ |
| `completed` | Solution Completed | 🎉 |

### Frontend Components
- `LiveFAQTracker.jsx` — Modular component, two modes: `compact` (inline progress) and full (stepper)
- `main.jsx` — Initializes Socket.IO client (`window.io`)
- `ThreadDetail.jsx` — Shows full `LiveFAQTracker` below back button

### Socket.IO Events
- `faq_status_update` — emitted on every status change; LiveFAQTracker listens and re-renders

### API Endpoints
- `GET /api/track/:threadId` — get tracker for thread
- `POST /api/track` — create tracker (auto-called on thread create)
- `PUT /api/track/:threadId/status` — advance status
- `PUT /api/track/:threadId/ai-analysis` — store AI analysis results
- `GET /api/track` — list all trackers (admin)
- `GET /api/track/stats/summary` — aggregate counts by status

### Auto-Advancement Logic
- Thread created → tracker with `received` status auto-created
- Answer submitted → tracker advances to `expert_review` (frontend + backend track.js endpoint)
- Admin verifies answer → tracker advances to `verified`
- Admin marks `completed` → tracker marked `completed`

---

---

## Pending Question Queue System

### Overview
New community questions enter a **waiting queue** before being published to the community feed. Each question gets a **queue number** that shows how many questions are ahead of it. Admins see the full queue and can approve/delete questions. Once approved, the user gets a notification.

### Flow
1. User posts a question → status = `pending`, `queueNumber` = current position in queue
2. User sees their question in "My Questions" with queue number and ahead-count
3. Admin sees all pending questions in a dedicated "Pending Queue" panel with sort options (priority, newest, queue number)
4. Admin approves → status changes to `active`, question appears in community
5. User gets a **notification** that their question was answered/published

### Queue Number Logic
- `queueNumber` = position assigned at creation = count of existing `pending` threads + 1
- `aheadCount` = count of other `pending` threads created before this one (dynamically computed)
- When a question is approved/removed from queue, all remaining `pending` threads do NOT shift queueNumber (queueNumber is fixed at creation). `aheadCount` is computed at read time.

### Thread Schema Changes
```
FAQThread {
  status: 'active' | 'pending' | 'flagged' | 'spam' | 'completed'
  queueNumber: Number   // assigned at creation when status='pending'
  queueAssignedAt: Date // when added to queue
}
```

### Backend Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/threads/create` | Creates thread with status=`pending` + assigns `queueNumber` |
| `GET` | `/api/threads/my-questions` | Returns user's threads (all statuses) |
| `GET` | `/api/admin/pending-queue` | Admin: all `pending` threads sorted by priority/queueNumber/newest |
| `POST` | `/api/admin/process-queue/:threadId` | Admin: `action='approve'` → active, `action='reject'` → spam/rejected |
| `GET` | `/api/threads/queue-position/:threadId` | Returns `{ queueNumber, aheadCount }` for a thread |

### Frontend Changes
- **FAQFeed.jsx** — "My Questions" tab shows each question's queue number + ahead count + status badge
- **Dashboard.jsx** (admin) — "Pending Queue" panel with sortable table, priority sort, approve/reject buttons
- **Notifications** — when admin approves, a notification is saved for the thread author

### Sort Options for Admin Queue Panel
- `queueNumber` (default) — FIFO order
- `priority` — urgent > high > normal
- `newest` — most recently submitted

### Status Badges (UI)
| Status | Badge |
|--------|-------|
| `pending` | 🟡 Queue #X — Y ahead |
| `active` | 🟢 Live in Community |
| `flagged` | 🔴 Flagged for Review |
| `completed` | ✅ Answered & Completed |
| `rejected` | ❌ Not Approved |