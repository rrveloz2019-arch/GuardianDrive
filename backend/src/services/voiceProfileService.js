// voiceProfileService.js
// Part 2 of the setup dashboard: voice profile training.
//
// IMPORTANT SCOPE NOTE: real speaker-recognition/voice-biometric training
// (the ML model that learns to recognize YOUR specific voice) needs a
// speech vendor (e.g. Azure Speech Speaker Recognition, Google Cloud
// Speech-to-Text adaptation, or a custom model). This service defines the
// DATA MODEL and WORKFLOW STATE for that process now, so the dashboard UI
// and API contract are ready — the actual ML call is a swap-in later once
// a vendor is chosen. Nothing here fakes a trained model as if it were real.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/voiceProfile.json');

const TRAINING_PHRASES = [
  'Hey Juanita, call my wife',
  'Send a text to the office saying I am running late',
  'What is on my calendar today',
  'Read my last email',
  'Set an appointment for tomorrow at 3 PM',
];

const DEFAULT_PROFILE = {
  status: 'not_started', // not_started | in_progress | complete
  samplesRecorded: 0,
  samplesRequired: TRAINING_PHRASES.length,
  trainingPhrases: TRAINING_PHRASES,
  recordedSampleIds: [],
  vendorModelId: null, // set once a real speech vendor trains a model
  updatedAt: null,
};

async function readProfile() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return { ...DEFAULT_PROFILE };
    if (err instanceof SyntaxError) return { ...DEFAULT_PROFILE };
    throw err;
  }
}

async function saveProfile(profile) {
  await writeFile(DATA_FILE, JSON.stringify(profile, null, 2), 'utf-8');
  return profile;
}

export async function getVoiceProfile() {
  return readProfile();
}

// Records that one training sample was captured (the actual audio blob
// handling belongs to the client/mobile app + a storage service - this
// method just tracks progress state).
export async function recordSample(sampleId) {
  if (!sampleId) throw new Error('sampleId is required');

  const profile = await readProfile();
  if (profile.recordedSampleIds.includes(sampleId)) {
    return profile; // idempotent - already recorded
  }

  profile.recordedSampleIds.push(sampleId);
  profile.samplesRecorded = profile.recordedSampleIds.length;
  profile.status = profile.samplesRecorded >= profile.samplesRequired
    ? 'complete'
    : 'in_progress';
  profile.updatedAt = new Date().toISOString();

  return saveProfile(profile);
}

export async function resetVoiceProfile() {
  return saveProfile({ ...DEFAULT_PROFILE, updatedAt: new Date().toISOString() });
}
