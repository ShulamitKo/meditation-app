export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const correctPassword = process.env.APP_PASSWORD;
  if (!correctPassword) {
    return res.status(500).json({ error: 'שגיאת מערכת. נסי שוב מאוחר יותר.' });
  }

  if (password === correctPassword) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false, error: 'סיסמה שגויה' });
  }
}
