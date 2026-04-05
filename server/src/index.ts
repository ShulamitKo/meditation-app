import express from 'express';
import cors from 'cors';
import path from 'path';
import { config, validateConfig } from './config';
import apiRoutes from './routes/api';
import fs from 'fs';

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Serve static files from public directory
app.use(express.static(config.publicDir));

// Serve output files (audio, images)
app.use('/output', express.static(config.outputDir));

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      port: config.port,
      nodeEnv: config.nodeEnv,
      hasGeminiKey: !!config.geminiApiKey,
      hasElevenlabsKey: !!config.elevenlabsApiKey,
    },
  });
});

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(config.publicDir, 'index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log('\n🧘 ========================================');
  console.log('   Meditation Web App Server');
  console.log('   ========================================\n');
  console.log(`   🌐 Server running on: http://localhost:${PORT}`);
  console.log(`   📁 Public files: ${config.publicDir}`);
  console.log(`   📁 Output files: ${config.outputDir}`);
  console.log(`   🔑 Gemini API: ${config.geminiApiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   🔑 ElevenLabs API: ${config.elevenlabsApiKey ? '✅ Configured' : '⚠️  Not configured (will use template fallback)'}`);
  console.log('');

  // Validate configuration
  const isValid = validateConfig();
  if (!isValid) {
    console.log('   ⚠️  Please check your .env file\n');
  }

  console.log('   Ready to create meditations! 🌟\n');
  console.log('========================================\n');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
