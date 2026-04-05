import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';

export interface SpeechGenerationOptions {
  text: string;
  outputFilename: string;
  voiceId?: string;
  speed?: number;
  stability?: number;
}

/**
 * Generate speech audio from text using ElevenLabs API directly
 */
export async function generateSpeech(options: SpeechGenerationOptions): Promise<string> {
  const {
    text,
    outputFilename,
    voiceId = 'cgSgspJ2msm6clMCkdW9', // Jessica - warm and calm voice
    speed = 0.8,
    stability = 0.5,
  } = options;

  if (!config.elevenlabsApiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured in .env');
  }

  const outputPath = path.join(config.outputDir, outputFilename);

  console.log(`🎙️  Generating speech via ElevenLabs API...`);
  console.log(`   Voice: ${voiceId}, Speed: ${speed}x`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': config.elevenlabsApiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
          speed,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(audioBuffer));

  const stats = await fs.stat(outputPath);
  console.log(`✅ Speech generated successfully (${(stats.size / 1024).toFixed(1)} KB)`);

  return outputFilename;
}
