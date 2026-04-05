const fetch = require('node-fetch');

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

  // Rate limiting
  const { checkRateLimit } = require('../lib/rate-limit');
  const rateCheck = checkRateLimit(req, 'audio');
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: rateCheck.message });
  }

  try {
    const { text, meditationId, gender } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'חסר טקסט למדיטציה' });
    }

    // Check if ElevenLabs API key is configured
    if (!process.env.ELEVENLABS_API_KEY) {
      console.warn('⚠️  ELEVENLABS_API_KEY not configured');
      return res.status(503).json({
        error: 'שירות ההקלטות אינו זמין כרגע',
        message: 'נסי שוב מאוחר יותר'
      });
    }

    console.log(`🎙️  Generating audio for meditation ${meditationId}...`);
    console.log(`📝 Text preview: ${text.substring(0, 100)}...`);

    // Use text as-is - v3 understands ellipsis and punctuation naturally
    const meditationText = text;

    // Voice selection by gender (custom IDs)
    // Female: 1wGbFxmAM3Fgw63G1zZJ
    // Male: Dj7pgiuloVNRtSboSnjm
    const voiceId = (gender === 'male')
      ? 'Dj7pgiuloVNRtSboSnjm'
      : '1wGbFxmAM3Fgw63G1zZJ';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

    const body = {
      text: meditationText,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 1.0,        // Robust - most stable (v3: 0.0, 0.5, 1.0)
        similarity_boost: 0.5, // Lower for softer, calmer tone
        style: 0.0,            // Zero style for neutral, calm delivery
        use_speaker_boost: false // Disabled for softer, more natural sound
      }
    };

    console.log(`🔊 Using voiceId: ${voiceId}, model: eleven_v3, gender: ${gender || 'female'}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API failed (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const audioBase64 = audioBuffer.toString('base64');

    console.log(`✅ Audio generated successfully (${audioBuffer.length} bytes)`);

    // Return audio as base64
    return res.status(200).json({
      success: true,
      audio: audioBase64,
      contentType: 'audio/mpeg',
      size: audioBuffer.length
    });

  } catch (error) {
    console.error('❌ Error generating audio:', error);
    console.error('Original error:', error.message);
    return res.status(500).json({
      error: 'שגיאה ביצירת ההקלטה. נסי שוב.',
      details: error.message || String(error)
    });
  }
};
