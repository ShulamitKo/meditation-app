import { Router, Request, Response } from 'express';
import {
  createMeditation,
  getMeditation,
  generateMeditationAudio,
  generateMeditationImage,
  getAllMeditations,
} from '../controllers/meditation';
import { MeditationRequest } from '../utils/claude';

const router = Router();

/**
 * POST /api/meditation/create
 * Create a new meditation
 */
router.post('/meditation/create', async (req: Request, res: Response) => {
  try {
    const request: MeditationRequest = {
      type: req.body.type || 'relaxation',
      duration: req.body.duration || 10,
      topic: req.body.topic,
      style: req.body.style || 'secular',
    };

    // Validate request
    const validTypes = ['relaxation', 'sleep', 'focus', 'healing', 'self-love'];
    if (!validTypes.includes(request.type)) {
      return res.status(400).json({ error: 'Invalid meditation type' });
    }

    const validDurations = [3, 5, 10, 15, 20];
    if (!validDurations.includes(request.duration)) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    const validStyles = ['spiritual', 'secular', 'gentle', 'energetic', 'deep'];
    if (!validStyles.includes(request.style)) {
      return res.status(400).json({ error: 'Invalid style' });
    }

    // Create meditation
    const meditation = await createMeditation(request);

    res.json({
      id: meditation.id,
      text: meditation.text,
      type: meditation.type,
      duration: meditation.duration,
      style: meditation.style,
      createdAt: meditation.createdAt,
      status: 'text_ready',
    });

  } catch (error: any) {
    console.error('Error creating meditation:', error);
    res.status(500).json({ error: error.message || 'Failed to create meditation' });
  }
});

/**
 * GET /api/meditation/:id
 * Get meditation by ID
 */
router.get('/meditation/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const meditation = getMeditation(id);

    if (!meditation) {
      return res.status(404).json({ error: 'Meditation not found' });
    }

    res.json(meditation);

  } catch (error: any) {
    console.error('Error getting meditation:', error);
    res.status(500).json({ error: error.message || 'Failed to get meditation' });
  }
});

/**
 * POST /api/meditation/:id/generate-audio
 * Generate audio for meditation
 */
router.post('/meditation/:id/generate-audio', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const audioUrl = await generateMeditationAudio(id);

    res.json({
      audioUrl,
      status: 'audio_ready',
    });

  } catch (error: any) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: error.message || 'Failed to generate audio' });
  }
});

/**
 * POST /api/meditation/:id/generate-image
 * Generate image for meditation
 */
router.post('/meditation/:id/generate-image', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const imageUrl = await generateMeditationImage(id);

    res.json({
      imageUrl,
      status: 'image_ready',
    });

  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

/**
 * GET /api/meditations
 * Get all meditations (for debugging)
 */
router.get('/meditations', (req: Request, res: Response) => {
  try {
    const meditations = getAllMeditations();
    res.json(meditations);
  } catch (error: any) {
    console.error('Error getting meditations:', error);
    res.status(500).json({ error: error.message || 'Failed to get meditations' });
  }
});

export default router;
