// ─── Project Constants ─────────────────────────────────────────────────────────
// All important URLs, ports, thresholds, and feature flags live here.
// Edit this file to change behavior across the whole app.
// ─────────────────────────────────────────────────────────────────────────────

const Config = {
  // ── API ──────────────────────────────────────────────────────────────────────
  // Backend API base URL. Leave empty string '' for Vite proxy (default dev).
  // Set to 'https://your-api.com/api' when frontend is deployed separately.
  API_URL: import.meta.env.VITE_API_URL || '',

  // Vite dev proxy target (only used when API_URL is empty)
  API_PROXY_TARGET: import.meta.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',

  // Socket.IO server origin (defaults to VITE_API_PROXY_TARGET if not separately set)
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',

  // ── Ports ────────────────────────────────────────────────────────────────────
  BACKEND_PORT: import.meta.env.VITE_BACKEND_PORT || '5000',
  FRONTEND_PORT: import.meta.env.VITE_FRONTEND_PORT || '5173',

  // ── AI / Moderation ──────────────────────────────────────────────────────────
  // Threads with similarity score >= this threshold are blocked as duplicates
  DUPLICATE_SIMILARITY_THRESHOLD: 0.45,
  // Content with toxicity score >= this is auto-flagged
  TOXICITY_FLAG_THRESHOLD: 0.4,
  // Content with spam probability >= this is auto-flagged
  SPAM_FLAG_THRESHOLD: 0.3,

  // ── Queue ───────────────────────────────────────────────────────────────────
  // Sort options available in the admin pending queue panel
  QUEUE_SORT_OPTIONS: [
    { key: 'queueNumber', label: 'Queue #' },
    { key: 'priority',    label: '🔴 Priority' },
    { key: 'newest',       label: '🕐 Newest' }
  ],

  // ── Feature Flags ────────────────────────────────────────────────────────────
  ENABLE_DEMO_LOGIN: import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true',
  DEV_HOST: import.meta.env.VITE_DEV_HOST || 'localhost',

  // ── UI ──────────────────────────────────────────────────────────────────────
  MAX_TITLE_LENGTH: 180,
  MAX_BODY_LENGTH: 4000,
  SEARCH_DEBOUNCE_MS: 500,
};

export default Config;
