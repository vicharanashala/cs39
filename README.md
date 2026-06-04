# IIT Ropar AI FAQ & Community Platform

A full-stack, AI-powered FAQ and peer community support platform built for the IIT Ropar internship, selection, and academics student ecosystem.

Built on the **MERN Stack** (MongoDB, Express, React, Node.js) with JWT authentication, real-time Socket.IO events, local retrieval-augmented AI, and a dual Light/Dark theme UI.

---

## 🚀 Quick Start

### Step 1: Database Setup

1. Ensure your MongoDB server is running locally, or use a MongoDB Atlas cluster.
2. Create `backend/.env` using `backend/.env.example` as a template.
3. Set the following environment variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/iit_ropar_faq
JWT_SECRET=your_long_random_secret_here
ENABLE_DEMO_SEED=true
ENABLE_FAQ_SEED=true
```

For Atlas, replace `MONGODB_URI` with:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/iit_ropar_faq?retryWrites=true&w=majority
```

### Step 2: Launch Backend

```bash
cd backend
npm install
npm run dev
```

The server starts on `http://localhost:5000`. Demo accounts and seeded FAQ content are loaded automatically when `ENABLE_DEMO_SEED=true` and `ENABLE_FAQ_SEED=true`.

### Step 3: Launch Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The Vite dev server proxies all `/api` requests to the backend automatically.

---

## 🏭 Production Deployment

1. Run `npm ci` inside both `backend/` and `frontend/`.
2. Build the frontend: `cd frontend && npm run build`.
3. Set production environment variables in `backend/.env`:
   - `NODE_ENV=production`
   - `ENABLE_DEMO_SEED=false`
   - `ENABLE_FAQ_SEED=false`
   - `CORS_ORIGINS=https://your-frontend-domain.com`
4. Start the backend: `cd backend && npm start`.
   - In production, the backend serves the compiled `frontend/dist` directly.
5. The health check endpoint is available at `GET /api/health`.

To deploy the frontend separately on a CDN or static host, build with:
```bash
VITE_API_URL=https://your-api-host/api npm run build
```

---

## 🔑 Demo Login Credentials

Demo accounts are seeded in local development (`ENABLE_DEMO_SEED=true`). Use the **Quick Fill** buttons on the login screen or enter manually:

| Role | Email | Password | Username | Notable Features |
| :--- | :--- | :--- | :--- | :--- |
| **Student — Champion** | `priya@iitr.ac.in` | `student123` | `Priya_Sharma` | Level 5, 410 SP, full badge catalog, bookmarks |
| **Student — Rising Star** | `sanjay@iitr.ac.in` | `student123` | `Sanjay_Kumar` | Level 3, 240 SP, peer answers |
| **Admin** | `admin@iitr.ac.in` | `admin123` | `Admin_Ropar` | Verification, moderation, merge, export, checklist management |

---

## 🌟 Core Features & Workflows

### 1. FAQ Feed — Four-Folder Browser

The main FAQ board is divided into four curated folders:

| Folder | Contents |
| :--- | :--- |
| **Getting Started** | Internship onboarding, selection process, announcements |
| **Documents & Dates** | Certificates, deadlines, stipend, payment timelines |
| **Learning & Work** | Attendance, assignments, mentorship, projects |
| **Platform & Help** | Technical issues, account support, general queries |

- Switch between **Official FAQs** (staff-vetted) and **Community Threads** (peer discussions).
- Use **Smart Search** (wand icon) to activate the local semantic duplicate checker as you search.
- Bookmark any thread to save it locally across sessions.

### 2. Trending FAQs

- A horizontally scrollable card strip ranks the top FAQ threads by a composite score: recent views, helpful votes, search clicks, and recency.
- Each card shows a trend label (Hot / Rising / Popular / New), a category tag, and a score progress bar.
- Cards use a warm `#fff9c4` light-yellow background with a golden glow on hover, and are ranked with the top card highlighted in the brand accent color.

### 3. AI Duplicate Detection

- **Trigger**: Click **Ask Question** and start typing a title (e.g. `summer internship portal opening`).
- **Mechanism**: The frontend debounces input and calls `/api/threads/check-duplicate`. The backend uses TF-IDF vector cosine similarity with local spell correction against all existing thread titles.
- **Result**: A warning popup appears showing matched threads with percentage similarity, prompting the student to view the existing FAQ instead of creating a duplicate.

### 4. RAG Copilot (Floating Chat Assistant)

- Open the floating chat bubble (bottom-right corner).
- Ask natural language questions like: *"Where is the Bonafide Certificate template?"* or *"What is the minimum attendance?"*
- The bot uses local spell correction, category classification, synonym expansion, and ranked FAQ retrieval — no external API calls or paid tokens required.
- **Low-confidence fallback**: Suggests related threads and offers an **Ask the Community** shortcut. It never auto-posts without the student's explicit action.

### 5. What's New — Live Update Stream

- Displays a real-time feed of official FAQ changes, admin announcements, and content updates.
- Each card shows the change type (new / updated / important / announcement), a reason, and a timestamp.
- Unread updates are marked with a warm amber dot indicator.
- Clicking a card opens a **side-by-side diff modal** showing the exact before-and-after content for the question and answer.
- Filter the stream by change type using the pill filter bar.

### 6. SP Reputation & Gamification

- **Actions that earn SP**: posting questions, submitting answers, receiving helpful votes, getting answers verified.
- **Real-time alerts**: Earning SP triggers a Socket.IO toast: *"✨ SP Gained! You received +5 SP points"*.
- **Level-up modal**: Crossing a level threshold (every 100 SP) triggers a full-screen Level Up celebration.

### 7. Admin Command Center (Dashboard)

Accessible only to accounts with `role: 'admin'`:

#### Publication Review Queue
- All student-submitted questions appear here pending approval.
- Admins can **Approve** (publish to the FAQ feed) or **Reject** (apply an SP penalty and log the reason).

#### Answer Verification
- Admins can mark any student answer as verified, which pins it and stamps it *"Verified by IIT Ropar Team"*.
- The verified author receives a real-time Socket.IO notification.

#### Toxicity Moderation Queue
- Posts containing flagged terms or written entirely in CAPS are automatically flagged (`toxicityScore > 0.6`) and hidden from the student feed.
- Admins can **Approve** (publish) or **Delete** (apply -5 SP penalty).
- The toxicity vocabulary includes modern slang, hate speech patterns, and spam signals.

#### Duplicate FAQ Merge
- Select a duplicate thread (source) and a canonical thread (target), then click **Merge Threads**.
- The duplicate is archived; all its answers are migrated to the canonical thread.

#### Export (CSV & PDF)
- The admin panel supports exporting data (threads, users, moderation logs) in both **CSV** and **PDF** formats directly from the dashboard.

#### Rejection Log
- A dedicated modal shows a full audit log of all rejected submissions, including the rejection reason and the SP penalty applied.

### 8. Attendance Support

Students can report issues that prevented them from attending a session (internet outage, device failure, power cut, microphone/camera issues):

1. **Select issue type** — choose from pre-defined categories with icons.
2. **Troubleshooting checklist** — guided steps before submitting.
3. **Submit request** — with optional proof upload (screenshot/video).
4. **Track tickets** — view all submitted requests and their resolution status.

Admins see a **Ticket Inbox** with filters (by user, email, issue type, date range), can update status (Pending / Approved / Rejected), reply to follow-up threads, manage troubleshooting checklists, and view a **Support Analytics** summary.

### 9. Notifications

- The navbar bell icon shows real-time notifications for answer approvals, rejections, and SP awards.
- Unread notifications are highlighted with a pulsing indigo dot.
- Clicking **Mark all read** clears the unread state server-side.

### 10. Theme System

- Toggle between **Light** and **Dark** themes using the moon/sun icon in the navbar.
- The Light Theme uses a warm SaaS-inspired palette with golden amber accents (`#E07A15`) and soft yellow highlights.
- The Dark Theme uses a deep charcoal base (`#050608`) with subtle white-opacity layering.
- Theme preference persists across sessions.

---

## 📁 Project Structure

```
cs39/
├── backend/
│   ├── config/
│   │   └── db.js                   # Mongoose connection setup
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT verification & role guard
│   ├── models/
│   │   └── Schemas.js              # Unified Mongoose schemas (User, Thread, Answer, Notification, Update, SupportRequest, ...)
│   ├── routes/
│   │   ├── auth.js                 # Login, registration, token refresh
│   │   ├── threads.js              # CRUD, upvotes, comments, bookmarks, trending
│   │   ├── admin.js                # Verification, moderation, merge, export, analytics
│   │   ├── profile.js              # SP stats, badge catalog
│   │   ├── notifications.js        # Unread notifications, mark-as-read
│   │   ├── chatbot.js              # RAG Copilot query router
│   │   ├── leaderboard.js          # Rankings, weekly missions progress
│   │   ├── updates.js              # What's New feed CRUD & view metrics
│   │   └── support.js              # Attendance support tickets & admin queue
│   ├── services/
│   │   ├── aiService.js            # TF-IDF, spell correction, toxicity heuristics, RAG
│   │   └── reputation.js           # SP transactions, level progression, badge triggers
│   ├── server.js                   # Express entry point, Socket.IO, seeding
│   └── .env                        # PORT, MONGODB_URI, JWT_SECRET, seed flags
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         # Navigation sidebar with role-based tabs
│   │   │   ├── Navbar.jsx          # Header: clock, notifications, theme toggle, user badge
│   │   │   ├── FloatingChatbot.jsx # RAG Copilot collapsible chat pane
│   │   │   └── UnableToAttendSession.jsx  # Attendance support wizard & admin queue
│   │   ├── context/
│   │   │   └── AppContext.jsx      # Global React Context (user, theme, alerts, bookmarks)
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Auth screen with demo quick-fill
│   │   │   ├── FAQFeed.jsx         # FAQ board: trending strip, folder browser, search, ask modal
│   │   │   ├── ThreadDetail.jsx    # Thread view: nested answers, admin controls, AI suggestions
│   │   │   ├── WhatsNew.jsx        # Live update stream with diff modal
│   │   │   ├── AttendanceSupport.jsx # Attendance support page wrapper
│   │   │   ├── Profile.jsx         # SP history, badges, LeetCode stats, course widgets
│   │   │   ├── Leaderboard.jsx     # Rankings table & weekly missions checklist
│   │   │   └── Dashboard.jsx       # Role-adaptive dashboard (student stats / admin command center)
│   │   ├── utils/
│   │   │   ├── api.js              # Axios client with JWT interceptors
│   │   │   └── socket.js           # Socket.IO client for real-time events
│   │   ├── App.jsx                 # Root layout, routing, global alert toaster
│   │   ├── index.css               # Global styles, Tailwind base, custom utilities
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS v3 |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | JWT (access tokens, HTTP-only cookies optional) |
| **Real-time** | Socket.IO (SP alerts, answer verifications, notifications) |
| **AI / NLP** | Local TF-IDF, cosine similarity, Levenshtein spell correction, synonym expansion — no external API |
| **Icons** | Lucide React |
| **Export** | CSV (json2csv) & PDF (pdfkit or equivalent) |

---

## 📝 Environment Variables Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Backend server port |
| `MONGODB_URI` | `mongodb://localhost:27017/iit_ropar_faq` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | Secret key for signing JWT tokens — use a random string of at least 32 characters |
| `NODE_ENV` | `development` | Set to `production` for live deployments |
| `ENABLE_DEMO_SEED` | `true` | Seeds demo user accounts on startup |
| `ENABLE_FAQ_SEED` | `true` | Seeds default FAQ content on startup |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed CORS origins |
| `VITE_API_URL` | *(proxied in dev)* | Override the API base URL for standalone frontend builds |
