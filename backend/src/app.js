// app.js - Express app definition, separated from index.js so it can be
// imported directly by tests without starting a real network listener.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import identityRouter from './routes/identity.js';
import voiceProfileRouter from './routes/voiceProfile.js';
import commandsRouter from './routes/commands.js';
import authRouter from './routes/auth.js';
import { registerAllCapabilities } from './capabilities/index.js';

let capabilitiesRegistered = false;

export function createApp() {
  // Idempotent: registering twice (e.g. across test files) would throw
  // on duplicate map keys otherwise - registerCapability uses a Map so
  // it's actually safe to call repeatedly, but guard anyway for clarity.
  if (!capabilitiesRegistered) {
    registerAllCapabilities();
    capabilitiesRegistered = true;
  }

  const app = express();
  app.use(express.json());

  // Serve the setup dashboard UI (public/index.html + assets)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '../public')));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'guardiandrive-backend', time: new Date().toISOString() });
  });

  app.use('/api/identity', identityRouter);
  app.use('/api/voice-profile', voiceProfileRouter);
  app.use('/api/commands', commandsRouter);
  app.use('/auth/google', authRouter);

  return app;
}
