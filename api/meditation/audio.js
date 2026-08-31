const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Vary', 'Origin');
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

  // Server-side gate: the login screen alone proves nothing.
  const { requireAuth } = require('../lib/auth');
  if (!requireAuth(req, res)) return;

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

    // Voice selection by gender (custom IDs)
    // Female: 1wGbFxmAM3Fgw63G1zZJ
    // Male: Dj7pgiuloVNRtSboSnjm
    const voiceId = (gender === 'male')
      ? 'Dj7pgiuloVNRtSboSnjm'
      : '1wGbFxmAM3Fgw63G1zZJ';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

    // Model history: eleven_v3 renders this Hebrew content cleanly (verified word-for-word
    // against a cloud STT transcript) but takes ~0.3s/word - too slow to fit a full
    // meditation in one call under Vercel Hobby's hard 60s function cap.
    // eleven_flash_v2_5 is fast enough, but the SAME STT check showed it starts correct
    // and then degenerates into looping gibberish partway through long Hebrew input -
    // not a transcription artifact, a real model failure on this content.
    // Fix: keep v3 (the one that's actually correct) and split into paragraph-sized
    // chunks synthesized IN PARALLEL, so wall-clock time stays ~one chunk's duration
    // regardless of total meditation length, then stitch the MP3s back together.
    const MODEL_ID = 'eleven_v3';
    const voiceSettings = {
      stability: 1.0,        // Robust - most stable (v3: 0.0, 0.5, 1.0)
      similarity_boost: 0.5, // Lower for softer, calmer tone
      style: 0.0,            // Zero style for neutral, calm delivery
      use_speaker_boost: false // Disabled for softer, more natural sound
    };

    // Chunk by paragraph, keeping each chunk under ~120 words so a single ElevenLabs
    // call comfortably finishes well inside the 60s cap even under load.
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const chunks = [];
    let current = [];
    let currentWords = 0;
    const MAX_WORDS_PER_CHUNK = 120;
    for (const para of paragraphs) {
      const paraWords = para.split(/\s+/).filter(Boolean).length;
      if (currentWords > 0 && currentWords + paraWords > MAX_WORDS_PER_CHUNK) {
        chunks.push(current.join('\n\n'));
        current = [];
        currentWords = 0;
      }
      current.push(para);
      currentWords += paraWords;
    }
    if (current.length) chunks.push(current.join('\n\n'));

    console.log(`🔊 Using voiceId: ${voiceId}, model: ${MODEL_ID}, gender: ${gender || 'female'}, chunks: ${chunks.length}`);

    const buffers = await Promise.all(chunks.map(async (chunkText, i) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: chunkText, model_id: MODEL_ID, voice_settings: voiceSettings }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API failed on chunk ${i + 1}/${chunks.length} (${response.status}): ${errorText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }));

    const audioBuffer = Buffer.concat(buffers);
    const audioBase64 = audioBuffer.toString('base64');

    console.log(`✅ Audio generated successfully (${audioBuffer.length} bytes, ${chunks.length} chunks stitched)`);

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
