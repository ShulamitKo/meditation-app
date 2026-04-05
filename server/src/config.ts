import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // API Keys
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',

  // Output directory
  outputDir: path.join(__dirname, '../../output'),
  publicDir: path.join(__dirname, '../../public'),
};

export function validateConfig() {
  const required = [
    ['ANTHROPIC_API_KEY', config.anthropicApiKey],
    ['GEMINI_API_KEY', config.geminiApiKey],
  ];

  const missing = required.filter(([, val]) => !val).map(([key]) => key);

  if (missing.length > 0) {
    console.warn('⚠️  Missing required environment variables:');
    missing.forEach(key => console.warn(`   - ${key}`));
    console.warn('   Copy .env.example to .env and fill in the values.');
  }

  if (!config.elevenlabsApiKey) {
    console.warn('⚠️  ELEVENLABS_API_KEY not set — audio generation will be skipped');
  }

  return missing.length === 0;
}
