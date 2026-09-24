// commandMappingService.js
// Part 3 of the setup dashboard: command mapping.
// Lets you customize which spoken trigger phrase maps to which
// capability action - e.g. "check my inbox" -> email.read_latest

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCapability } from '../capabilities/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/commandMappings.json');

// Sensible defaults matching your Phase 1 scope, so the dashboard isn't
// empty on first run - the user can still rename/add/remove any of these.
const DEFAULT_MAPPINGS = [
  { id: 'default-search', triggerPhrase: 'search for', capabilityId: 'search', actionId: 'query' },
  { id: 'default-email-read', triggerPhrase: 'read my email', capabilityId: 'email', actionId: 'read_latest' },
  { id: 'default-calendar-create', triggerPhrase: 'set an appointment', capabilityId: 'calendar', actionId: 'create_appointment' },
  { id: 'default-calendar-read', triggerPhrase: "what is on my calendar", capabilityId: 'calendar', actionId: 'read_today' },
  { id: 'default-documents-create', triggerPhrase: 'create a document', capabilityId: 'documents', actionId: 'create' },
  { id: 'default-documents-read', triggerPhrase: 'read my last document', capabilityId: 'documents', actionId: 'read_latest' },
  { id: 'default-calls-resolve', triggerPhrase: 'call', capabilityId: 'calls', actionId: 'resolve_contact_for_call' },
  { id: 'default-texts-compose', triggerPhrase: 'send a text to', capabilityId: 'texts', actionId: 'compose' },
  { id: 'default-maps-locate', triggerPhrase: 'where is', capabilityId: 'maps', actionId: 'locate' },
  { id: 'default-maps-directions', triggerPhrase: 'directions', capabilityId: 'maps', actionId: 'directions' },
  { id: 'default-whatsapp-send', triggerPhrase: 'send a whatsapp to', capabilityId: 'whatsapp', actionId: 'send' },
  { id: 'default-sms-send', triggerPhrase: 'send an sms to', capabilityId: 'sms', actionId: 'send' },
  { id: 'default-secondary-email-send', triggerPhrase: 'send an outlook email to', capabilityId: 'secondaryEmail', actionId: 'send' },
];

async function readMappings() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [...DEFAULT_MAPPINGS];
    if (err instanceof SyntaxError) return [...DEFAULT_MAPPINGS];
    throw err;
  }
}

async function saveMappings(mappings) {
  await writeFile(DATA_FILE, JSON.stringify(mappings, null, 2), 'utf-8');
  return mappings;
}

export async function listMappings() {
  return readMappings();
}

export async function addMapping({ triggerPhrase, capabilityId, actionId }) {
  if (!triggerPhrase || triggerPhrase.trim().length === 0) {
    throw new Error('triggerPhrase is required');
  }
  const capability = getCapability(capabilityId);
  if (!capability) {
    const err = new Error(`Unknown capability: ${capabilityId}`);
    err.code = 'UNKNOWN_CAPABILITY';
    throw err;
  }
  if (!capability.actions[actionId]) {
    const err = new Error(`Capability "${capabilityId}" has no action "${actionId}"`);
    err.code = 'UNKNOWN_ACTION';
    throw err;
  }

  const mappings = await readMappings();

  const normalizedPhrase = triggerPhrase.trim().toLowerCase();
  if (mappings.some((m) => m.triggerPhrase.toLowerCase() === normalizedPhrase)) {
    const err = new Error(`Trigger phrase "${triggerPhrase}" is already mapped`);
    err.code = 'DUPLICATE_TRIGGER';
    throw err;
  }

  const mapping = {
    id: `mapping-${Date.now()}`,
    triggerPhrase: triggerPhrase.trim(),
    capabilityId,
    actionId,
  };
  mappings.push(mapping);
  await saveMappings(mappings);
  return mapping;
}

export async function removeMapping(id) {
  const mappings = await readMappings();
  const filtered = mappings.filter((m) => m.id !== id);
  if (filtered.length === mappings.length) {
    const err = new Error(`No mapping found with id "${id}"`);
    err.code = 'NOT_FOUND';
    throw err;
  }
  await saveMappings(filtered);
  return { removed: id };
}

// Given a spoken phrase, finds the best-matching command (simple
// substring match for now - swap for fuzzy/NLU matching later).
export async function resolveCommand(spokenText) {
  const mappings = await readMappings();
  const normalized = spokenText.trim().toLowerCase();

  const match = mappings.find((m) => normalized.includes(m.triggerPhrase.toLowerCase()));
  if (!match) return null;

  return {
    ...match,
    remainder: normalized.replace(match.triggerPhrase.toLowerCase(), '').trim(),
  };
}
