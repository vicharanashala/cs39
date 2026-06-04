// ─── Backend Constants ─────────────────────────────────────────────────────────
// All important configuration values live here.
// Values are read from environment variables (backend/.env) with fallbacks.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // ── Server ──────────────────────────────────────────────────────────────────
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── Database ────────────────────────────────────────────────────────────────
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_in_production_min_32_chars',

  // ── CORS ────────────────────────────────────────────────────────────────────
  // Comma-separated list of allowed frontend origins
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),

  // ── AI / Moderation ─────────────────────────────────────────────────────────
  SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.45,
  TOXICITY_FLAG_THRESHOLD: 0.4,
  SPAM_FLAG_THRESHOLD: 0.3,

  // ── Rate Limiting ───────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: 60 * 1000,     // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 120,

  // ── Seeding ─────────────────────────────────────────────────────────────────
  // Enable demo account seeding in development (always true unless explicitly disabled)
  ENABLE_DEMO_SEED: process.env.ENABLE_DEMO_SEED !== 'false',
  // Enable FAQ seeding (127 official FAQs)
  ENABLE_FAQ_SEED: process.env.ENABLE_FAQ_SEED !== 'false',
};
