// identityService.js
// Handles Part 1 of the setup dashboard: assistant name + wake word.
// Storage: simple JSON file for now (swap for a real DB later).

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/identity.json');

const DEFAULT_IDENTITY = {
  assistantName: null,   // e.g. "Juanita"
  wakePhrase: null,      // e.g. "Hey Juanita"
  createdAt: null,
  updatedAt: null,
};

async function readIdentity() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return { ...DEFAULT_IDENTITY };
    // Empty or corrupt file (e.g. a reset-by-overwrite) - treat as fresh.
    if (err instanceof SyntaxError) return { ...DEFAULT_IDENTITY };
    throw err;
  }
}

async function saveIdentity(identity) {
  await writeFile(DATA_FILE, JSON.stringify(identity, null, 2), 'utf-8');
  return identity;
}

// Basic validation rules for a usable wake phrase:
// - must start with a common wake-trigger word ("hey", "ok") for now, or be explicitly flagged as custom
// - must be 2-4 words to keep false-positive/false-negative rates reasonable
function validateWakePhrase(phrase) {
  const errors = [];
  if (!phrase || typeof phrase !== 'string') {
    errors.push('Wake phrase is required.');
    return { valid: false, errors };
  }
  const trimmed = phrase.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  if (wordCount < 2) errors.push('Wake phrase should be at least 2 words (e.g. "Hey Juanita").');
  if (wordCount > 4) errors.push('Wake phrase should be 4 words or fewer to stay reliable while driving.');
  if (trimmed.length < 4) errors.push('Wake phrase is too short.');

  return { valid: errors.length === 0, errors };
}

export async function getIdentity() {
  return readIdentity();
}

export async function setIdentity({ assistantName, wakePhrase }) {
  const validation = validateWakePhrase(wakePhrase);
  if (!validation.valid) {
    const err = new Error('Invalid wake phrase');
    err.validation = validation.errors;
    throw err;
  }
  if (!assistantName || typeof assistantName !== 'string' || assistantName.trim().length === 0) {
    const err = new Error('Assistant name is required');
    err.validation = ['Assistant name cannot be empty.'];
    throw err;
  }

  const existing = await readIdentity();
  const now = new Date().toISOString();
  const identity = {
    assistantName: assistantName.trim(),
    wakePhrase: wakePhrase.trim(),
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
  return saveIdentity(identity);
}

export { validateWakePhrase };
