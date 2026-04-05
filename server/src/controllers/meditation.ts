import { v4 as uuidv4 } from 'uuid';
import { generateMeditationText, MeditationRequest } from '../utils/claude';
import { generateSpeech } from './speech';
import { generatePoster } from './poster';

// In-memory storage for meditations (in production, use a database)
interface Meditation {
  id: string;
  text: string;
  type: string;
  duration: number;
  topic?: string;
  style: string;
  audioUrl?: string;
  imageUrl?: string;
  createdAt: Date;
}

const meditations = new Map<string, Meditation>();

/**
 * Create a new meditation
 */
export async function createMeditation(request: MeditationRequest): Promise<Meditation> {
  const id = uuidv4();

  console.log(`\n🧘 Creating new meditation...`);
  console.log(`   ID: ${id}`);
  console.log(`   Type: ${request.type}`);
  console.log(`   Duration: ${request.duration} minutes`);

  try {
    // Generate meditation text using Claude Code CLI
    const text = await generateMeditationText(request);

    // Create meditation object
    const meditation: Meditation = {
      id,
      text,
      type: request.type,
      duration: request.duration,
      topic: request.topic,
      style: request.style,
      createdAt: new Date(),
    };

    // Store in memory
    meditations.set(id, meditation);

    console.log(`✅ Meditation created successfully!`);
    return meditation;

  } catch (error: any) {
    console.error(`❌ Failed to create meditation:`, error.message);
    throw error;
  }
}

/**
 * Get meditation by ID
 */
export function getMeditation(id: string): Meditation | undefined {
  return meditations.get(id);
}

/**
 * Generate audio for a meditation
 */
export async function generateMeditationAudio(id: string): Promise<string> {
  const meditation = meditations.get(id);
  if (!meditation) {
    throw new Error('Meditation not found');
  }

  if (meditation.audioUrl) {
    console.log(`⚡ Audio already exists for meditation ${id}`);
    return meditation.audioUrl;
  }

  console.log(`\n🎙️  Generating audio for meditation ${id}...`);

  try {
    const audioFilename = `meditation-${id}.mp3`;

    await generateSpeech({
      text: meditation.text,
      outputFilename: audioFilename,
      speed: 0.8, // Slow and calm
      stability: 0.5,
    });

    // Update meditation with audio URL
    meditation.audioUrl = `/output/${audioFilename}`;
    meditations.set(id, meditation);

    console.log(`✅ Audio generated: ${meditation.audioUrl}`);
    return meditation.audioUrl;

  } catch (error: any) {
    console.error(`❌ Failed to generate audio:`, error.message);
    throw error;
  }
}

/**
 * Generate image for a meditation
 */
export async function generateMeditationImage(id: string): Promise<string> {
  const meditation = meditations.get(id);
  if (!meditation) {
    throw new Error('Meditation not found');
  }

  if (meditation.imageUrl) {
    console.log(`⚡ Image already exists for meditation ${id}`);
    return meditation.imageUrl;
  }

  console.log(`\n🖼️  Generating image for meditation ${id}...`);

  try {
    const imageFilename = `meditation-${id}.jpg`;

    await generatePoster({
      meditationType: meditation.type,
      outputFilename: imageFilename,
    });

    // Update meditation with image URL
    meditation.imageUrl = `/output/${imageFilename}`;
    meditations.set(id, meditation);

    console.log(`✅ Image generated: ${meditation.imageUrl}`);
    return meditation.imageUrl;

  } catch (error: any) {
    console.error(`❌ Failed to generate image:`, error.message);
    throw error;
  }
}

/**
 * Get all meditations (for admin/debugging)
 */
export function getAllMeditations(): Meditation[] {
  return Array.from(meditations.values());
}
