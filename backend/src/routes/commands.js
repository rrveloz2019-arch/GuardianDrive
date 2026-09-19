import { Router } from 'express';
import { listMappings, addMapping, removeMapping, resolveCommand } from '../services/commandMappingService.js';
import { listCapabilities, runCapabilityAction } from '../capabilities/registry.js';

const router = Router();

router.get('/capabilities', (req, res) => {
  res.json(listCapabilities());
});

router.get('/', async (req, res) => {
  res.json(await listMappings());
});

router.post('/', async (req, res) => {
  try {
    const mapping = await addMapping(req.body);
    res.status(201).json(mapping);
  } catch (err) {
    res.status(400).json({ error: err.message, code: err.code });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    res.status(200).json(await removeMapping(req.params.id));
  } catch (err) {
    res.status(404).json({ error: err.message, code: err.code });
  }
});

// Runs a capability action directly with explicit params - bypasses
// spoken-phrase matching entirely. Useful for testing/debugging a
// capability (e.g. email.send with real to/subject/body) before the
// voice-command NLU layer can parse those fields out of free text.
router.post('/run', async (req, res) => {
  const { capabilityId, actionId, params, userTier } = req.body;
  if (!capabilityId || !actionId) {
    return res.status(400).json({ error: 'capabilityId and actionId are required' });
  }
  try {
    const result = await runCapabilityAction(capabilityId, actionId, params || {}, { userTier });
    res.status(200).json({ result });
  } catch (err) {
    const status = err.code === 'TIER_REQUIRED' ? 402 : err.code === 'UNKNOWN_CAPABILITY' || err.code === 'UNKNOWN_ACTION' ? 404 : 400;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

// Simulates what happens when the wake word fires and speech-to-text
// hands over a transcript: resolve which command it matches, then run it.
router.post('/resolve-and-run', async (req, res) => {
  const { spokenText, userTier } = req.body;
  if (!spokenText) return res.status(400).json({ error: 'spokenText is required' });

  const match = await resolveCommand(spokenText);
  if (!match) {
    return res.status(404).json({ error: 'No command matched that phrase', spokenText });
  }

  try {
    const result = await runCapabilityAction(
      match.capabilityId,
      match.actionId,
      { query: match.remainder },
      { userTier }
    );
    res.status(200).json({ matchedCommand: match, result });
  } catch (err) {
    const status = err.code === 'TIER_REQUIRED' ? 402 : 400;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

export default router;
