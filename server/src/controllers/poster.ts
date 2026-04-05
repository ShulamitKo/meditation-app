import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';

export interface PosterGenerationOptions {
  meditationType: string;
  outputFilename: string;
}

/**
 * Generate calming image using Google Gemini Imagen API directly
 */
export async function generatePoster(options: PosterGenerationOptions): Promise<string> {
  const { meditationType, outputFilename } = options;

  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const prompt = buildImagePrompt(meditationType);
  const outputPath = path.join(config.outputDir, outputFilename);

  console.log(`🖼️  Generating calming image via Gemini API...`);
  console.log(`   Type: ${meditationType}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${config.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = await response.json() as any;
  const imageBase64 = data?.predictions?.[0]?.bytesBase64Encoded;

  if (!imageBase64) {
    throw new Error('No image returned from Gemini API');
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(imageBase64, 'base64'));

  const stats = await fs.stat(outputPath);
  console.log(`✅ Image generated successfully (${(stats.size / 1024).toFixed(1)} KB)`);

  return outputFilename;
}

function buildImagePrompt(meditationType: string): string {
  const prompts: Record<string, string> = {
    relaxation: 'Peaceful natural landscape at golden hour, soft warm sunlight filtering through trees, serene atmosphere, gentle colors, calming and therapeutic, professional meditation imagery, pastel tones, tranquil scene',
    sleep: 'Dreamy night sky with soft stars and moon, peaceful bedroom scene with soft lighting, calming deep blue and purple tones, serene and sleepy atmosphere, therapeutic sleep imagery, gentle gradients',
    focus: 'Clear mountain peak at sunrise, sharp focus with soft background, minimalist zen garden with clean lines, inspiring and energizing, professional and calm, crisp lighting, motivating atmosphere',
    healing: 'Warm healing light surrounding a peaceful figure, soft golden and pink tones, gentle embracing atmosphere, therapeutic and safe, comforting imagery, loving energy visualization, serene healing space',
    'self-love': 'Person with arms open to sunshine, heart chakra glowing, warm loving light, self-acceptance imagery, gentle pink and gold tones, empowering and tender, therapeutic self-love visualization',
  };

  const basePrompt = prompts[meditationType] || prompts.relaxation;
  return `${basePrompt}, high quality, professional, calming, therapeutic meditation imagery, soft focus, peaceful mood, serene atmosphere`;
}
