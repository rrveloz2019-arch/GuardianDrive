import { Router } from 'express';
import { getVoiceProfile, recordSample, resetVoiceProfile } from '../services/voiceProfileService.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await getVoiceProfile());
});

router.post('/sample', async (req, res) => {
  try {
    const profile = await recordSample(req.body.sampleId);
    res.status(200).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reset', async (req, res) => {
  res.status(200).json(await resetVoiceProfile());
});

export default router;
