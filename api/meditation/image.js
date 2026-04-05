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
  const rateCheck = checkRateLimit(req, 'image');
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: rateCheck.message });
  }

  try {
    const { type, meditationId } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'חסר סוג מדיטציה' });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not configured');
      return res.status(503).json({
        error: 'שירות התמונות אינו זמין כרגע',
        message: 'נסי שוב מאוחר יותר'
      });
    }

    console.log(`🎨 Generating image for meditation ${meditationId}, type: ${type}...`);

    const geminiApiKey = process.env.GEMINI_API_KEY.trim();

    // Dynamic import of @google/genai (ES Module)
    const { GoogleGenAI, createUserContent } = await import('@google/genai');

    // Initialize Gemini client
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    // Create prompt based on meditation type
    const imagePrompts = {
      relaxation: 'A calming image of a soft sunset over a quiet ocean, warm colors of orange and pink, gentle waves, atmosphere of peace and tranquility',
      sleep: 'An image of night sky with stars and soft clouds, deep dark colors of blue and purple, gentle moon, atmosphere of rest and sleep',
      focus: 'An image of a single stone on smooth sand in a zen garden, minimalist lines, neutral colors, atmosphere of concentration and clarity',
      healing: 'An image of warm golden light piercing through clouds, rays of healing light, colors of gold and soft green, atmosphere of healing and hope',
      'self-love': 'An image of a gentle heart made of light, soft pink and golden glow, soft cloud background, atmosphere of self-love and compassion',
      other: 'A meditative and calming image, simple and beautiful natural landscape, soft and peaceful colors, atmosphere of inner peace'
    };

    const prompt = imagePrompts[type] || imagePrompts.other;
    const fullPrompt = `Create a beautiful and calming meditation image: ${prompt}. The image should be aesthetic, minimalist, and evoke positive emotions. No text.`;

    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: {
        imageSize: '1K',
      },
    };

    const candidateModels = [
      'gemini-2.0-flash-exp-image-generation',
      'gemini-2.0-flash-preview-image-generation',
      'gemini-2.5-flash-image-preview',
      'gemini-2.0-flash-exp',
    ];
    const contents = createUserContent([fullPrompt]);

    console.log('Calling Gemini API for image generation...');

    // Generate image with model fallback
    let imageData = null;
    let imageMimeType = null;
    let lastModelError = null;

    // 0) Discover image-capable models available for this exact API key
    try {
      const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      if (listResp.ok) {
        const listJson = await listResp.json();
        const discovered = (listJson.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map((m) => (m.name || '').replace(/^models\//, ''))
          .filter((name) => /image|vision|flash|gemini/i.test(name));

        for (const name of discovered) {
          if (!candidateModels.includes(name)) candidateModels.unshift(name);
        }

        console.log('Discovered models for key:', candidateModels.slice(0, 8));
      }
    } catch (discoverError) {
      console.warn('Could not discover models list:', discoverError.message);
    }

    // 1) Try Imagen endpoint (if available for this key)
    try {
      if (typeof ai.models.generateImages === 'function') {
        const imageResp = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: fullPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '1:1',
          },
        });

        const generated = imageResp?.generatedImages?.[0]?.image;
        const bytes = generated?.imageBytes || generated?.data || null;
        const mime = generated?.mimeType || 'image/png';

        if (bytes) {
          imageData = bytes;
          imageMimeType = mime;
          console.log('✅ Image generated with Imagen model');
        }
      }
    } catch (imagenError) {
      lastModelError = imagenError;
      console.warn('Imagen model failed:', imagenError.message);
    }

    // 2) Try Gemini multimodal image models (stream)
    for (const model of candidateModels) {
      if (imageData) break;

      try {
        const response = await ai.models.generateContentStream({
          model,
          config,
          contents,
        });

        for await (const chunk of response) {
          const parts = chunk?.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            const inlineData = part?.inlineData;
            if (!inlineData?.data) continue;
            imageData = inlineData.data;
            imageMimeType = inlineData.mimeType || 'image/png';
            break;
          }
          if (imageData) break;
        }

        if (imageData) {
          console.log(`✅ Image generated with model: ${model}`);
          break;
        }
      } catch (modelError) {
        lastModelError = modelError;
        console.warn(`Model ${model} failed:`, modelError.message);
      }
    }

    if (!imageData) {
      const msg = lastModelError?.message || 'No image data received from AI';
      console.warn('⚠️ Gemini image failed, trying fallback generator:', msg);

      const fallbackUrls = [
        `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&model=flux&nologo=true&safe=true`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&model=turbo&nologo=true&safe=true`,
      ];

      let fallbackError = null;
      for (const fallbackUrl of fallbackUrls) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const fallbackResp = await fetch(fallbackUrl, { method: 'GET' });
            if (!fallbackResp.ok) {
              throw new Error(`fallback ${fallbackResp.status}`);
            }

            const arrayBuffer = await fallbackResp.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            if (!imageBuffer.length) {
              throw new Error('fallback empty image');
            }

            imageData = imageBuffer.toString('base64');
            imageMimeType = fallbackResp.headers.get('content-type') || 'image/jpeg';
            console.log(`✅ Image generated via fallback (attempt ${attempt})`);
            break;
          } catch (err) {
            fallbackError = err;
          }
        }

        if (imageData) break;
      }

      if (!imageData) {
        console.warn('⚠️ All image providers failed, returning resilient built-in image');

        const safeType = (type || 'meditation').toString().slice(0, 40);
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5a4"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="430" r="230" fill="rgba(255,255,255,0.14)"/>
  <circle cx="512" cy="430" r="150" fill="rgba(255,255,255,0.22)"/>
  <text x="512" y="780" font-family="Heebo, Arial, sans-serif" font-size="46" text-anchor="middle" fill="white" opacity="0.95">🧘 ${safeType}</text>
</svg>`;

        imageData = Buffer.from(svg, 'utf-8').toString('base64');
        imageMimeType = 'image/svg+xml';
      }
    }

    console.log(`✅ Image generated successfully (${imageMimeType})`);

    // Return image as base64
    return res.status(200).json({
      success: true,
      image: imageData,
      contentType: imageMimeType,
      size: Buffer.from(imageData, 'base64').length
    });

  } catch (error) {
    console.error('❌ Error generating image:', error);
    console.error('Original error:', error.message);
    return res.status(500).json({
      error: 'שגיאה ביצירת התמונה. נסי שוב.',
      details: error.message || String(error)
    });
  }
};
