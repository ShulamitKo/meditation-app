// Simple in-memory rate limiter per IP
// Resets when serverless function cold-starts (good enough for basic protection)

const store = new Map();

const LIMITS = {
  create_hourly: { max: 5, windowMs: 60 * 60 * 1000, message: 'הגעת למגבלת יצירת המדיטציות (5 בשעה). נסי שוב בעוד שעה 🧘' },
  create_daily: { max: 10, windowMs: 24 * 60 * 60 * 1000, message: 'הגעת למגבלה היומית (10 מדיטציות ביום). נסי שוב מחר 🧘' },
  audio: { max: 100, windowMs: 24 * 60 * 60 * 1000, message: 'הגעת למגבלת השימוש ⏳' },
  image: { max: 100, windowMs: 24 * 60 * 60 * 1000, message: 'הגעת למגבלת השימוש ⏳' },
};

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

function checkRateLimit(req, type) {
  const ip = getClientIP(req);
  const limit = LIMITS[type] || LIMITS.global;
  const key = `${ip}:${type}`;
  const now = Date.now();

  // Clean old entries
  if (!store.has(key)) {
    store.set(key, []);
  }

  const timestamps = store.get(key).filter(t => now - t < limit.windowMs);
  store.set(key, timestamps);

  if (timestamps.length >= limit.max) {
    const waitMin = Math.ceil((timestamps[0] + limit.windowMs - now) / 60000);
    return {
      allowed: false,
      message: limit.message,
      waitMinutes: waitMin,
      remaining: 0,
    };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  return {
    allowed: true,
    remaining: limit.max - timestamps.length,
  };
}

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store.entries()) {
    const fresh = timestamps.filter(t => now - t < 60 * 60 * 1000);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  }
}, 10 * 60 * 1000);

module.exports = { checkRateLimit };
