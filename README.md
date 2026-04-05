# 🧘 מחולל מדיטציות אישיות

אפליקציה וובית מקומית ליצירת מדיטציות מותאמות אישית עם AI.

## ✨ תכונות

- 🎯 **6 סוגי מדיטציה**: הרפיה, שינה, מיקוד, ריפוי רגשי, אהבה עצמית, ונושא חופשי
- 🚻 **בחירת מגדר קול**: נשי / גברי (משפיע על ניסוח הטקסט)
- 🎨 **5 סגנונות**: רוחני, חילוני, עדין, אנרגטי, עמוק
- 📝 **טקסט טיפולי** — נוצר עם Claude AI, עם fallback לתבניות מובנות
- 🎙️ **דיבוב קולי** — ElevenLabs TTS **(אופציונלי)**

> ⚠️ האפליקציה עובדת גם ללא ElevenLabs — תיווצר מדיטציה טקסטואלית בלבד.
>
> ℹ️ משך המדיטציה קבוע ל-3 דקות. תמיכה בבחירת אורך ובתמונה מרגיעה — בפיתוח.

---

## 🚀 התקנה

### דרישות

- **Node.js v18+** — [nodejs.org](https://nodejs.org)

### שלב 1 — שכפול

```bash
git clone https://github.com/ShulamitKo/meditation-app.git
cd meditation-app/server
```

### שלב 2 — מפתחות API

| שירות | שימוש | חובה? | קישור |
|-------|-------|-------|-------|
| **Anthropic Claude** | יצירת טקסט | ✅ כן | [console.anthropic.com](https://console.anthropic.com) |
| **ElevenLabs** | דיבוב קולי | ❌ אופציונלי | [elevenlabs.io](https://elevenlabs.io) |
| **Google Gemini** | יצירת תמונה (בפיתוח) | ❌ אופציונלי | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

```bash
cp .env.example .env
# ערכו את .env והוסיפו את המפתחות
```

### שלב 3 — התקנה והפעלה

```bash
npm install
npm run dev
```

פתחו: **http://localhost:3000**

---

## 🔌 API

### `POST /api/meditation/create`

```json
{
  "type": "relaxation",
  "duration": 10,
  "style": "secular",
  "topic": "הפחתת מתח"
}
```

ערכים אפשריים:
- `type`: `relaxation` | `sleep` | `focus` | `healing` | `self-love`
- `duration`: `3` | `5` | `10` | `15` | `20`
- `style`: `spiritual` | `secular` | `gentle` | `energetic` | `deep`
- `topic`: טקסט חופשי, אופציונלי

תשובה:
```json
{
  "id": "uuid",
  "text": "טקסט המדיטציה...",
  "status": "text_ready"
}
```

### `POST /api/meditation/:id/generate-audio`
יוצר MP3 דרך ElevenLabs (דורש `ELEVENLABS_API_KEY`)

### `POST /api/meditation/:id/generate-image`
יוצר תמונה דרך Gemini Imagen (דורש `GEMINI_API_KEY`)

### `GET /api/meditation/:id`
מחזיר מדיטציה לפי ID

### `GET /health`
בדיקת סטטוס השרת ואילו API keys מוגדרים

---

## 🏗️ מבנה

```
meditation-app/
├── public/                  # Frontend
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server/
│   ├── src/
│   │   ├── index.ts         # Express server
│   │   ├── config.ts        # הגדרות ומשתני סביבה
│   │   ├── routes/api.ts    # הגדרת endpoints
│   │   ├── controllers/
│   │   │   ├── meditation.ts  # ניהול מדיטציות (in-memory)
│   │   │   ├── speech.ts      # ElevenLabs TTS
│   │   │   └── poster.ts      # Gemini Imagen
│   │   └── utils/claude.ts    # Anthropic API + fallback templates
│   ├── .env.example
│   └── package.json
└── output/                  # קבצים שנוצרו (MP3, תמונות)
```

> **שימו לב:** המדיטציות נשמרות ב-memory בלבד — נמחקות כשהשרת מופסק.

---

## 🛠️ פתרון בעיות

| בעיה | פתרון |
|------|-------|
| `Cannot find module` | `npm install` בתוך `server/` |
| אין טקסט מדיטציה | בדקו `ANTHROPIC_API_KEY` ב-`.env` |
| אין קול | בדקו `ELEVENLABS_API_KEY` — אופציונלי |
| פורט 3000 תפוס | הוסיפו `PORT=3001` ב-`.env` |

---

## 📄 רישיון

MIT — חופשי לשימוש ושינוי.
