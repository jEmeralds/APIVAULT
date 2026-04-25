// server/middleware/rateLimit.js
// In-memory buckets. For multi-instance deploys, swap to Redis.

const buckets = new Map()

function check(key, limit, windowMs) {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.reset) b = { count: 0, reset: now + windowMs }
  b.count++
  buckets.set(key, b)
  return b.count > limit
}

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k)
}, 600_000)

export const limiter = {
  // Brute force: 10 bad keys per IP per hour
  isBadKeyBlocked: (ip)  => check(`bad:${ip}`, 10, 3_600_000),
  recordBadKey:    (ip)  => check(`bad:${ip}`, 0,  3_600_000),

  // API call throttle: 60 calls per user per API per minute
  isThrottled: (userId, slug) => check(`th:${userId}:${slug}`, 60, 60_000),

  // Daily spend cap: 1000 calls per user per day
  isDailyCapped: (userId) => check(`day:${userId}`, 1000, 86_400_000),
}
