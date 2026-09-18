// routes/identity.js
import { Router } from 'express';
import { getIdentity, setIdentity } from '../services/identityService.js';

const router = Router();

// GET current identity (assistant name + wake phrase)
router.get('/', async (req, res) => {
  const identity = await getIdentity();
  res.json(identity);
});

// POST to set/update assistant name + wake phrase
router.post('/', async (req, res) => {
  const { assistantName, wakePhrase } = req.body;
  try {
    const identity = await setIdentity({ assistantName, wakePhrase });
    res.status(200).json(identity);
  } catch (err) {
    res.status(400).json({
      error: err.message,
      details: err.validation || [],
    });
  }
});

export default router;
