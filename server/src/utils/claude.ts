import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

export interface MeditationRequest {
  type: 'relaxation' | 'sleep' | 'focus' | 'healing' | 'self-love';
  duration: 3 | 5 | 10 | 15 | 20;
  topic?: string;
  style: 'spiritual' | 'secular' | 'gentle' | 'energetic' | 'deep';
}

/**
 * Generate meditation text using Claude API
 */
export async function generateMeditationText(request: MeditationRequest): Promise<string> {
  // Build the prompt based on guided-meditation SKILL.md
  const prompt = buildMeditationPrompt(request);

  try {
    console.log(`🧘 Generating meditation via Claude API...`);
    console.log(`   Type: ${request.type}, Duration: ${request.duration} min, Style: ${request.style}`);

    // Check if Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY not found, using template fallback');
      return generateTemplateMeditation(request);
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extract text from response
    const meditationText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    if (!meditationText || meditationText.length < 100) {
      throw new Error('Generated meditation text is too short or empty');
    }

    console.log(`✅ Meditation generated successfully (${meditationText.length} chars)`);
    return meditationText;

  } catch (error: any) {
    console.error('❌ Error generating meditation:', error.message);

    // Fallback: Generate a simple template-based meditation
    console.log('⚠️  Falling back to template-based meditation');
    return generateTemplateMeditation(request);
  }
}

/**
 * Build prompt for Claude API based on SKILL.md guidelines
 */
function buildMeditationPrompt(request: MeditationRequest): string {
  const typeDescriptions = {
    relaxation: 'הרפיה והפחתת מתח',
    sleep: 'הירדמות ושינה איכותית',
    focus: 'ריכוז ובהירות מנטלית',
    healing: 'ריפוי רגשי ופיזי',
    'self-love': 'אהבה עצמית וחמלה'
  };

  const styleDescriptions = {
    spiritual: 'כולל אלמנטים רוחניים',
    secular: 'חילוני ופרקטי',
    gentle: 'עדין, רך ומרגיע',
    energetic: 'אנרגטי, מעורר ומחזק',
    deep: 'עמוק, מעמיק ופנימי'
  };

  const topicPart = request.topic ? `\nנושא ספציפי: ${request.topic}` : '';
  const stylePart = styleDescriptions[request.style] || styleDescriptions.gentle;

  return `אתה מטפל מקצועי ומומחה במדיטציה ודמיון מודרך.

צור מדיטציה טיפולית מעמיקה עם המפרט הבא:

**מטרה:** ${typeDescriptions[request.type]}
**משך זמן:** ${request.duration} דקות${topicPart}
**סגנון:** ${stylePart}

**דרישות:**
1. מבנה טיפולי מקצועי:
   - פתיחה והכנה (10-15%)
   - עיגון והרפיה עם נשימה (15-20%)
   - גוף המדיטציה/הדמיון (50-60%)
   - סיום והשתלבות (10-15%)

2. שפה טיפולית:
   - שפה רכה, מכבדת ולא שיפוטית
   - שימוש ב"הזמן את עצמך ל..." במקום "אתה חייב"
   - תן אפשרות ובחירה: "אולי אתה מרגיש... או אולי משהו אחר"
   - סמן הפסקות עם "..." (3 נקודות = שניה אחת)

3. עיצוב החוויה:
   - השתמש בכל החושים (ראייה, שמיעה, ריח, מגע)
   - קצב איטי עם הפסקות שקט
   - תיאורים עשירים ומדויקים

4. בטיחות רגשית:
   - צור סביבה בטוחה ותומכת
   - אפשר למשתמש לעצור בכל רגע
   - הימנע מהנחות על חוויות אישיות

החזר רק את טקסט המדיטציה המלא, ללא כותרות או הסברים נוספים.
התחל ישירות עם המדיטציה.`;
}

/**
 * Fallback: Generate a simple template-based meditation
 * Used when Claude API is not available or fails
 */
function generateTemplateMeditation(request: MeditationRequest): string {
  const templates = {
    relaxation: `מצא לך מקום נוח לשבת או לשכב...

תן לעיניים להיסגר בעדינות...

...

נתחיל עם שלוש נשימות עמוקות...

נשום פנימה דרך האף... ונשחרר דרך הפה...

...

שים לב איך הגוף שלך מרגיש עכשיו...

אולי יש מקומות של מתח... ואולי יש מקומות רגועים...

...

תן לכתפיים לרדת קצת למטה...

תן ללסת להירגע...

...

כל נשימה היא הזדמנות לשחרר עוד קצת...

לתת ללכת...

...

אתה יכול פשוט להיות כאן...

עם הנשימה... עם הגוף...

...

ובקצב שלך... כשאתה מוכן...

תוכל להעמיק את הנשימה...

ולפקוח את העיניים בעדינות.`,

    sleep: `מצא לך מצב נוח לשכיבה...

תן לגוף להיתמך במיטה...

...

העיניים כבר יכולות להיסגר...

...

נשימה אחת עמוקה...

שאיפה... ושחרור...

...

תן לגוף להיות כבד...

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

ואתה יכול פשוט להרשות לעצמך...

להירדם...`,

    focus: `שב בנוחות עם הגב זקוף...

העיניים יכולות להיות פקוחות או עצומות...

...

הבא את תשומת הלב לנשימה...

רק שים לב... ללא שיפוט...

...

אוויר נכנס... אוויר יוצא...

...

כשהמחשבות מגיעות... ואות יבואו...

פשוט שים לב להן...

ותחזור לנשימה...

...

זה התרגול... לחזור... שוב ושוב...

...

כל פעם שחוזרים... המוח מתחזק...

כמו שריר...

...

ועכשיו... עם המיקוד הזה...

אתה מוכן להמשיך ביום שלך...

בהירות... עם נוכחות.`,

    healing: `מצא לך מקום בטוח ושקט...

תן לעצמך להירגע...

...

נשימה עמוקה...

שאיפה של ריפוי... שחרור של כאב...

...

דמיין אור חם ומרפא...

אור שנוגע בכל מקום שצריך...

...

האור הזה מביא רכות... הבנה... אהבה...

...

אתה יכול לתת לעצמך לרפא...

בקצב שלך... בדרך שלך...

...

אין לחץ... אין צורך למהר...

...

כל נשימה היא תהליך...

כל רגע הוא צעד...

...

ואתה לא לבד בזה...

האור הזה תמיד כאן... בשבילך.`,

    'self-love': `התיישב בנוחות...

הבא את תשומת הלב אל הלב...

...

נשימה אחת עמוקה לתוך הלב...

...

תן לעצמך רגע...

רגע להיות פשוט מי שאתה...

...

אולי זה לא תמיד קל...

ולכן זה חשוב עוד יותר...

...

תגיד לעצמך בשקט...

"אני מספיק בדיוק כפי שאני..."

...

"אני ראוי לאהבה..."

...

"אני עושה כמיטב יכולתי..."

...

תן למילים האלה לחדור...

לרכך... להרגיע...

...

ותן לעצמך לקבל את האהבה הזו...

שמגיעה לך... פשוט כי אתה קיים.`
  };

  const template = templates[request.type] || templates.relaxation;

  return template;
}
