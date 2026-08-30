const { issueToken, sessionCookie, isAuthenticated } = require('../lib/auth');

module.exports = (req, res) => {
  // GET: does the caller already hold a valid session?
  if (req.method === 'GET') {
    return res.status(200).json({ authenticated: isAuthenticated(req) });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const correctPassword = process.env.APP_PASSWORD;
  if (!correctPassword) {
    return res.status(500).json({ error: 'שגיאת מערכת. נסי שוב מאוחר יותר.' });
  }

  if (password !== correctPassword) {
    return res.status(401).json({ success: false, error: 'סיסמה שגויה' });
  }

  // Correct password -> hand out a signed, HttpOnly session cookie.
  res.setHeader('Set-Cookie', sessionCookie(issueToken()));
  return res.status(200).json({ success: true });
};
