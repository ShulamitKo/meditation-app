// Server-side session gate for the meditation endpoints.
//
// The login screen alone is client-side and proves nothing: anyone could call
// /api/meditation/* directly and burn the ElevenLabs / Anthropic credits.
// /api/auth/verify now issues an HMAC-signed token in an HttpOnly cookie, and
// every meditation endpoint verifies it before doing paid work.

const crypto = require('crypto');

const COOKIE_NAME = 'med_session';
const MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

function sessionKey() {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return crypto.createHash('sha256').update('meditation-session:' + password).digest();
}

function issueToken() {
  const key = sessionKey();
  if (!key) return null;
  const expiresAt = String(Date.now() + MAX_AGE_SEC * 1000);
  const mac = crypto.createHmac('sha256', key).update(expiresAt).digest('hex');
  return expiresAt + '.' + mac;
}

function isValidToken(token) {
  const key = sessionKey();
  if (!key || !token) return false;

  const parts = String(token).split('.');
  if (parts.length !== 2) return false;

  const expected = crypto.createHmac('sha256', key).update(parts[0]).digest('hex');
  const given = Buffer.from(parts[1]);
  const want = Buffer.from(expected);
  if (given.length !== want.length) return false;
  if (!crypto.timingSafeEqual(given, want)) return false;

  return Number(parts[0]) > Date.now();
}

function readCookie(req, name) {
  const raw = req.headers && req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

function sessionCookie(token) {
  return COOKIE_NAME + '=' + encodeURIComponent(token) +
    '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + MAX_AGE_SEC;
}

function isAuthenticated(req) {
  return isValidToken(readCookie(req, COOKIE_NAME));
}

// Returns true when the caller may proceed; otherwise answers 401 itself.
function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: 'נדרשת התחברות. רעננו את הדף והזינו את הסיסמה.' });
  return false;
}

module.exports = {
  COOKIE_NAME,
  issueToken,
  isValidToken,
  readCookie,
  sessionCookie,
  isAuthenticated,
  requireAuth,
};
