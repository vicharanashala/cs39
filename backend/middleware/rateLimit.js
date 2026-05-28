const buckets = new Map();

function createRateLimiter({ windowMs, maxRequests, message }) {
  return (req, res, next) => {
    const now = Date.now();
    if (buckets.size > 10000) {
      for (const [storedKey, storedBucket] of buckets) {
        if (storedBucket.resetAt <= now) buckets.delete(storedKey);
      }
    }
    const key = `${req.ip}:${req.baseUrl || req.path}`;
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      return res.status(429).json({ message });
    }

    next();
  };
}

module.exports = createRateLimiter;
