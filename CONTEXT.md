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
C:\Users\Lenovo\Desktop\Prototype\
├── backend/
│   ├── server.js           # Express + Socket.IO + MongoDB
│   ├── models/Schemas.js    # All MongoDB schemas
│   ├── routes/
│   │   ├── threads.js       # FAQ CRUD + search + paraphrase
│   │   ├── admin.js         # Admin panel + analytics endpoints
│   │   ├── auth.js          # Login/signup
│   │   └── ...
│   └── services/
│       ├── aiService.js     # paraphraseQuery(), analyzeFAQ()
│       └── reputation.js    # SP point system
├── frontend/src/
│   ├── App.jsx              # Main app + routing
│   ├── pages/
│   │   ├── FAQFeed.jsx      # Main FAQ listing + search
│   │   ├── ThreadDetail.jsx  # Thread + answers + comments
│   │   ├── Dashboard.jsx     # Admin + student dashboard
│   │   ├── Analytics.jsx     # Analytics 6-tab panel (admin)
│   │   └── Profile.jsx
│   └── components/
│       ├── Navbar.jsx
│       ├── TTSButton.jsx    # Wit.ai + browser fallback TTS
│       └── FloatingChatbot.jsx
```

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
| `FAQFeed.jsx` | Main FAQ list, search with smart/paraphrase toggle, TTS widget inline, answer expansion with TTS button |
| `ThreadDetail.jsx` | Full thread view, answers, comments, upvotes, admin verify, AI analysis panel |
| `Analytics.jsx` | 6-tab admin analytics — Overview, Most Searched, User Activity, Feedback, Trending, System |
| `TTSButton.jsx` | Reusable TTS component — Wit.ai API (POST JSON, voice=wit$Rebecca) or browser SpeechSynthesis fallback |

---

## Key State Variables (Frontend)
- `activeTab` — 'feed' | 'dashboard' | 'admin' | 'analytics' | 'profile'
- `selectedThreadId` — when set, shows ThreadDetail instead of tab content
- `expandedThreadId` — which thread answer is visible in FAQFeed
- `mode` — 'official' | 'community' | 'saved'
- TTS: `ttsKey`, `ttsStatus`, `ttsText`, `voices`, `selectedVoice`

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

## Context Exhaustion Plan
If tokens run out, read this file + the relevant SKILL.md files before continuing work.
Keep this file updated after every significant feature addition.