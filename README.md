# IIT Ropar FAQ + Student Community Support Platform

A modern, high-fidelity AI-powered FAQ and peer community support platform prototype designed for the IIT Ropar internship, selection, and academics student ecosystem. 

This project is built using the **MERN Stack** (MongoDB, Express, React, Node.js) with JWT authentication and a local retrieval-based FAQ assistant.

---

## 🚀 Quick Start Instructions

Follow these steps to launch the local prototype:

### Step 1: Database Setup
1. Ensure your MongoDB server is active.
2. Create `backend/.env` from `backend/.env.example`, or keep a `.env` file in the repository root for local development.
3. Set `MONGODB_URI` and replace `JWT_SECRET` with a long random secret. For Atlas, use a URI such as `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/iit_ropar_faq?retryWrites=true&w=majority`.

### Step 2: Launch Backend
Open a terminal inside the root folder and run:
```bash
cd backend
npm run dev
```
For local development, demo login accounts and FAQ content are prepared by default. Set `ENABLE_DEMO_SEED=false` or `ENABLE_FAQ_SEED=false` to disable either behavior. Set both to `false` in production unless running a deliberate one-time content import.

### Step 3: Launch Frontend
Open a new terminal inside the root folder and run:
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
The development server binds to localhost by default and proxies API requests to the backend `PORT` from the root `.env`. Set `VITE_API_PROXY_TARGET` only when the backend uses a different address; set `VITE_DEV_HOST=0.0.0.0` only when you intentionally need LAN testing.

---

## Production Deployment

1. Install dependencies with `npm ci` inside `backend` and `frontend`.
2. Build the frontend with `npm run build` inside `frontend`.
3. Configure `backend/.env` with `NODE_ENV=production`, a production `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and the deployed frontend origin in `CORS_ORIGINS`.
4. Keep `ENABLE_DEMO_SEED=false`, `ENABLE_FAQ_SEED=false`, and `VITE_ENABLE_DEMO_LOGIN=false` for a live deployment.
5. Start the server with `npm start` inside `backend`. In production it serves the compiled frontend from `frontend/dist`.

The health check is available at `/api/health`. To deploy the frontend separately, build with `VITE_API_URL=https://your-api-host/api`.

---

## Demo Login Credentials
These accounts are prepared in local development unless `ENABLE_DEMO_SEED=false`; their quick-fill buttons are hidden from production builds by default.
For testing the role-based routing and features, you can use the **Quick Prefill buttons** on the Login screen, or manually type these credentials:

| Account Type | Email | Password | Username | Key Features to Test |
| :--- | :--- | :--- | :--- | :--- |
| **👩‍🎓 Student (Champion)** | `priya@iitr.ac.in` | `student123` | `Priya_Sharma` | Level 5 (Champion), 410 SP points, badges catalog. |
| **👨‍🎓 Student (Novice)** | `sanjay@iitr.ac.in` | `student123` | `Sanjay_Kumar` | Level 3 (Rising Star), 240 SP. |
| **👮‍♂️ Staff (Admin)** | `admin@iitr.ac.in` | `admin123` | `Admin_Ropar` | Answer verification, pinning, duplicate FAQ merging, toxic moderation queues. |

---

## 🌟 Core Workflows & AI Mechanics

### 1. AI Duplicate Detection (Instant Title Checking)
- **How to test**: Log in as a student, click **"Ask Question"**, and start typing: `summer internship portal opening`.
- **AI Behavior**: As you type, the frontend debounces inputs and queries the backend `/check-duplicate` endpoint. It calculates Term-Frequency (TF) vectors and runs a Cosine Similarity match against existing titles.
- **Result**: You'll see a yellow popup warning: *"Matching Existing FAQ Suggestions"* showing the pre-seeded thread with matching percentages (e.g. *"95% Match"*), prompting you to view it instead of posting a duplicate!

### 2. Retrieval FAQ Assistant
- **How to test**: Click the floating bubble in the bottom right corner to open **RAG Copilot**. Ask a question like: *"Where can I find the Bonafide Certificate template?"* or *"What is the minimum attendance required?"*.
- **AI Behavior**: The bot uses spelling correction, topic matching, and ranked FAQ retrieval locally; it does not require paid model tokens.
- **Result**: It retrieves a compact best answer with its source thread and related suggestions.
- **Low Confidence Fallback**: It suggests relevant threads and offers **Ask the Community**. It never posts a public question without the student's explicit action.

### 3. Minimal Four-Section FAQ Browser
- **Getting Started**: internship, selection, and announcements.
- **Documents & Dates**: certificates, deadlines, and payments.
- **Learning & Work**: attendance, assignments, mentorship, and projects.
- **Platform & Help**: technical and general support questions.

### 4. SP Reputation & Gamification System
- **How to test**: Log in as student Priya, go to the **Leaderboard** tab. You'll see daily/weekly/monthly filter rankings and interactive **Weekly Missions** (e.g. *"Publish 2 new FAQ threads"*).
- **Actions**: Post an answer on a thread. You'll instantly receive a Socket.IO alert toast in the top right: *"✨ SP Gained! You received +5 SP points"*. If you advance over a 100 SP mark, a full-screen **Level Up** modal will lock the viewport, presenting your new rank.

### 5. Admin Verification & Duplicate Merge Panel
- **How to test**: Log in as `Admin_Ropar` and open the **Admin Terminal** tab or view thread detail pages.
- **Verifications**: Go to any student answer, click **"Verify"**. The system attaches the stamp *"Verified by IIT Ropar Team"*, pins the answer to the top, and sends a real-time Socket.IO alert to the student.
- **Duplicate Merges**: Go to the Admin Terminal. Under **"Merge Duplicate FAQs"**, select a duplicate thread (e.g., a newly posted student question) and a target main thread (e.g., Summer Internship Portal FAQ), and click **"Merge Threads"**.
- **Result**: The duplicate thread is archived, and all its existing student answers are migrated to the main FAQ thread.

### 6. Toxicity Moderation Queue
- **How to test**: Post a question containing flagged terms like `fuck`, `cheating`, or `crap` (or typed in ALL CAPS lock).
- **Moderation Behavior**: The backend moderation middleware automatically flags the post (toxicity > 0.6) and sets its status to `flagged`.
- **Result**: It hides the thread from the general student feed. Log in as Admin to see the thread listed in the **AI Content Moderation Flags** queue, showing its toxicity ratings, where you can choose to "Approve" (publish) or "Delete" (apply -5 SP penalty to the author).

---

## 📁 Repository Directory Structure

```
prototype/
├── backend/
│   ├── config/
│   │   └── db.js               # MongoDB Mongoose connection configs
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification & role validation
│   ├── models/
│   │   └── Schemas.js          # Unified Mongoose models
│   ├── routes/
│   │   ├── auth.js             # User login, registration, Google OAuth mocks
│   │   ├── threads.js          # Upvotes, Me Too, comments, replies routing
│   │   ├── admin.js            # Verification toggles, content moderation queries
│   │   ├── profile.js          # LeetCode statistics calculator
│   │   ├── notifications.js    # Unread notifications managers
│   │   ├── chatbot.js          # RAG Copilot query router
│   │   └── leaderboard.js      # rankings sorting & missions progress
│   ├── services/
│   │   ├── aiService.js        # TF-IDF similarity, toxicity heuristics, RAG
│   │   └── reputation.js       # SP transactions, level progressions, badge triggers
│   ├── package.json
│   ├── server.js               # Entry point with express, Socket.io, & database seeding
│   └── .env                    # PORT, MONGODB_URI, and JWT_SECRET
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx     # Nav bar with user info
│   │   │   ├── Navbar.jsx      # Header with notifications dropdown & level meters
│   │   │   └── FloatingChatbot.jsx # AI assistant collapsible pane
│   │   ├── context/
│   │   │   └── AppContext.jsx  # Global Zustand-equivalent React Context
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Glassmorphic lockscreen
│   │   │   ├── FAQFeed.jsx     # Board feed with similarity modal popup
│   │   │   ├── ThreadDetail.jsx # Nested comments, answers lists, admin buttons
│   │   │   ├── Profile.jsx     # LeetCode activity grids, course completion widgets
│   │   │   ├── Leaderboard.jsx # Rankings board & missions checklist
│   │   │   └── Dashboard.jsx   # Role dashboards with Recharts diagrams
│   │   ├── utils/
│   │   │   ├── api.js          # Axios client with JWT interceptors
│   │   │   └── socket.js       # Socket.IO client interface
│   │   ├── App.jsx             # App master layout and toaster containers
│   │   ├── index.css           # Styling with rounded scrollbars & glowing borders
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js      // Tailwind v3 configurations
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```
