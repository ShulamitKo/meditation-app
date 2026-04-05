// Load environment variables (works both locally and on Vercel)
const path = require('path');
// Try multiple paths to find .env file
const envPaths = [
  path.join(__dirname, '../../.env'),  // From api/meditation/ to root
  path.join(process.cwd(), '.env'),     // From current working directory
];

for (const envPath of envPaths) {
  const result = require('dotenv').config({ path: envPath });
  if (!result.error) {
    console.log(`✅ Loaded .env from: ${envPath}`);
    break;
  }
}

const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

async function generateMeditationWithClaude(request) {
  // Build the prompt
  const typeDescriptions = {
    relaxation: 'הרגעה ושחרור מתחים',
    sleep: 'הכנה לשינה עמוק ורגוע',
    focus: 'חידוד מיקוד וריכוז',
    healing: 'ריפוי רגשי ופיזי',
    'self-love': 'אהבה עצמית וחמלה עצמית'
  };

  const styleDescriptions = {
    gentle: 'עדין ורך, עם קצב איטי ומרגיע',
    energetic: 'אנרגטי ומעורר, עם קצב דינמי יותר',
    deep: 'עמוק ומעמיק, עם הזמנה למסע פנימי'
  };

  const typeDesc = typeDescriptions[request.type] || typeDescriptions.relaxation;
  const styleDesc = styleDescriptions[request.style] || styleDescriptions.gentle;
  const topic = request.topic ? `\n\nנושא ספציפי: ${request.topic}` : '';
  const gender = request.gender || 'female';
  const genderDesc = gender === 'male' ? 'גוף שני זכר (אתה)' : 'גוף שני נקבה (את)';
  const genderExample = gender === 'male' ? 'אתה' : 'את';
  const genderVerb = gender === 'male' ? 'מצא' : 'מצאי';
  const genderVerb2 = gender === 'male' ? 'תן' : 'תני';

  const prompt = `צור מדיטציה מודרכת בעברית בלבד למשך ${request.duration} דקות.

**חשוב מאוד: כתוב את כל התוכן בעברית בלבד! לא באנגלית!**

סוג המדיטציה: ${typeDesc}
סגנון: ${styleDesc}${topic}

הנחיות חשובות למדיטציה מוקלטת:
1. כתוב בעברית בלבד - כל מילה צריכה להיות בעברית
2. השתמש ב${genderDesc} בלבד - תמיד פנה ל${gender === 'male' ? 'זכר' : 'נקבה'}
3. שפה פשוטה, חמה, רגועה ומזמינה
4. **חשוב מאוד: השתמש במשפטים קצרים ופשוטים** - זה יוקלט לאודיו
5. **הפסקות ארוכות**: השתמש הרבה ב-"..." (שלוש נקודות) למקומות שצריך הפסקה ארוכה לנשימה
6. **מרווחים**: השאר שורה ריקה בין פסקאות - זה יהפוך להפסקה באודיו
7. **קצב איטי**: כתוב בקצב מתון ומרגיע, עם משפטים קצרים
8. התחל בהתיישבות והכנה, סיים בחזרה עדינה
9. אורך: כ-${request.duration} דקות קריאה איטית מאוד
10. ללא כותרות או מספור - רק טקסט המדיטציה הזורם

דוגמה לפורמט נכון (צור תוכן חדש ומקורי):

${genderVerb} לך מקום נוח לשבת...

${genderVerb2} לעיניים להיסגר בעדינות...

...

נשימה עמוקה...

שאיפה...

...

ושחרור...

...

זכור: כתוב הכל בעברית בלבד, בלשון ${gender === 'male' ? 'זכר' : 'נקבה'}, עם הפסקות רבות ומשפטים קצרים!`;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY not found, using template fallback');
      return generateTemplateMeditation(request);
    }

    console.log('🔑 ANTHROPIC_API_KEY found, calling Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY.trim(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    });

    console.log('📡 Claude API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Claude API error response:', errorText);
      throw new Error(`Claude API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('📦 Claude API result received');
    const meditationText = result.content[0].text;

    console.log('✅ Generated meditation with Claude API (length:', meditationText.length, 'chars)');
    return meditationText;

  } catch (error) {
    console.error('❌ Error calling Claude API:', error.message);
    console.error('Full error:', error);
    console.log('🔄 Falling back to template...');
    return generateTemplateMeditation(request);
  }
}

function generateTemplateMeditation(request) {
  const templates = {
    relaxation: `מצאי לך מקום נוח לשבת או לשכב...

תני לעיניים להיסגר בעדינות...

...

נתחיל עם שלוש נשימות עמוקות...

נשימי פנימה דרך האף... ונשחררי דרך הפה...

...

שימי לב איך הגוף שלך מרגיש עכשיו...

אולי יש מקומות של מתח... ואולי יש מקומות רגועים...

...

תני לכתפיים לרדת קצת למטה...

תני ללסת להירגע...

...

כל נשימה היא הזדמנות לשחרר עוד קצת...

לתת ללכת...

...

את יכולה פשוט להיות כאן...

עם הנשימה... עם הגוף...

...

ובקצב שלך... כשאת מוכנה...

תוכלי להעמיק את הנשימה...

ולפקוח את העיניים בעדינות.`,

    sleep: `מצאי לך מצב נוח לשכיבה...

תני לגוף להיתמך במיטה...

...

העיניים כבר יכולות להיסגר...

...

נשימה אחת עמוקה...

שאיפה... ושחרור...

...

תני לגוף להיות כבד...

כבד ונתמך...

...

אין שום דבר שצריך לעשות עכשיו...

אין שום מקום שצריך להגיע אליו...

...

רק לנשום... ולהיות...

...

כל נשימה לוקחת אותך עמוק יותר...

עמוק יותר לתוך המנוחה...

...

ואת יכולה פשוט להרשות לעצמך...

להירדם...`,

    focus: `שבי בנוחות עם הגב זקוף...

העיניים יכולות להיות פקוחות או עצומות...

...

הביאי את תשומת הלב לנשימה...

רק שימי לב... ללא שיפוט...

...

אוויר נכנס... אוויר יוצא...

...

כשהמחשבות מגיעות... והן יבואו...

פשוט שימי לב להן...

ותחזרי לנשימה...

...

זה התרגול... לחזור... שוב ושוב...

...

כל פעם שחוזרים... המוח מתחזק...

כמו שריר...

...

ועכשיו... עם המיקוד הזה...

את מוכנה להמשיך ביום שלך...

בהירות... עם נוכחות.`,

    healing: `מצאי לך מקום בטוח ושקט...

תני לעצמך להירגע...

...

נשימה עמוקה...

שאיפה של ריפוי... שחרור של כאב...

...

דמייני אור חם ומרפא...

אור שנוגע בכל מקום שצריך...

...

האור הזה מביא רכות... הבנה... אהבה...

...

את יכולה לתת לעצמך לרפא...

בקצב שלך... בדרך שלך...

...

אין לחץ... אין צורך למהר...

...

כל נשימה היא תהליך...

כל רגע הוא צעד...

...

ואת לא לבד בזה...

האור הזה תמיד כאן... בשבילך.`,

    'self-love': `התיישבי בנוחות...

הביאי את תשומת הלב אל הלב...

...

נשימה אחת עמוקה לתוך הלב...

...

תני לעצמך רגע...

רגע להיות פשוט מי שאת...

...

אולי זה לא תמיד קל...

ולכן זה חשוב עוד יותר...

תגידי לעצמך בשקט...

"אני מספיקה בדיוק כפי שאני..."

...

"אני ראויה לאהבה..."

...

"אני עושה כמיטב יכולתי..."

...

תני למילים האלה לחדור...

לרכך... להרגיע...

...

ותני לעצמך לקבל את האהבה הזו...

שמגיעה לך... פשוט כי את קיימת.`
  };

  return templates[request.type] || templates.relaxation;
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - 5/hour AND 10/day
  const { checkRateLimit } = require('../lib/rate-limit');
  const hourlyCheck = checkRateLimit(req, 'create_hourly');
  if (!hourlyCheck.allowed) {
    return res.status(429).json({ error: hourlyCheck.message });
  }
  const dailyCheck = checkRateLimit(req, 'create_daily');
  if (!dailyCheck.allowed) {
    return res.status(429).json({ error: dailyCheck.message });
  }

  try {
    const request = {
      ...req.body,
      duration: 3,
    };

    // Validate request
    const validTypes = ['relaxation', 'sleep', 'focus', 'healing', 'self-love'];
    if (!validTypes.includes(request.type)) {
      return res.status(400).json({ error: 'סוג מדיטציה לא תקין' });
    }

    const validDurations = [3, 5, 10, 15, 20];
    if (!validDurations.includes(request.duration)) {
      return res.status(400).json({ error: 'משך זמן לא תקין' });
    }

    const validStyles = ['spiritual', 'secular', 'gentle', 'energetic', 'deep'];
    if (!validStyles.includes(request.style)) {
      return res.status(400).json({ error: 'סגנון לא תקין' });
    }

    console.log(`🧘 Creating meditation: type=${request.type}, duration=${request.duration}, style=${request.style}`);

    // Generate meditation text with Claude
    const text = await generateMeditationWithClaude(request);
    const id = uuidv4();

    console.log(`✅ Meditation created: ${id}`);

    // Return meditation
    return res.status(200).json({
      id,
      text,
      type: request.type,
      duration: request.duration,
      style: request.style,
      gender: request.gender,
      topic: request.topic,
      createdAt: new Date().toISOString(),
      status: 'text_ready',
    });

  } catch (error) {
    console.error('❌ Error creating meditation:', error);
    console.error('Original error:', error.message);
    return res.status(500).json({ error: 'שגיאה ביצירת המדיטציה. נסי שוב.' });
  }
};
