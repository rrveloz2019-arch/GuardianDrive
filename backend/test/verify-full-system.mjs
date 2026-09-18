// Full end-to-end verification: identity, voice profile, capability
// registry, command mapping, and the resolve-and-run flow that ties
// them all together (simulating: wake word fires -> speech-to-text
// hands off a phrase -> command mapping resolves it -> capability runs).
import { createApp } from '../src/app.js';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

// Reset each data file to a known-empty state by OVERWRITING rather than
// deleting - the connected project folder blocks deletion by default,
// and overwrite-to-reset is the more robust pattern anyway.
for (const file of ['identity.json', 'voiceProfile.json', 'commandMappings.json']) {
  try { await writeFile(path.join(dataDir, file), '', 'utf-8'); } catch {}
}

const app = createApp();
const server = app.listen(0);
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

let failures = 0;
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${label}`);
  if (!cond) failures++;
}
async function post(urlPath, body) {
  const res = await fetch(`${base}${urlPath}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
async function get(urlPath) {
  const res = await fetch(`${base}${urlPath}`);
  return { status: res.status, body: await res.json() };
}

try {
  console.log('--- Identity (Part 1) ---');
  let r = await post('/api/identity', { assistantName: 'Juanita', wakePhrase: 'Hey Juanita' });
  check('Identity saves', r.status === 200 && r.body.assistantName === 'Juanita');

  console.log('--- Voice Profile (Part 2) ---');
  r = await get('/api/voice-profile');
  check('Voice profile starts not_started', r.body.status === 'not_started');
  check('Voice profile lists training phrases', Array.isArray(r.body.trainingPhrases) && r.body.trainingPhrases.length === 5);

  r = await post('/api/voice-profile/sample', { sampleId: 'sample-1' });
  check('Recording a sample moves status to in_progress', r.body.status === 'in_progress');

  for (const id of ['sample-2', 'sample-3', 'sample-4', 'sample-5']) {
    r = await post('/api/voice-profile/sample', { sampleId: id });
  }
  check('Recording all required samples completes the profile', r.body.status === 'complete');

  console.log('--- Capability Registry (growth engine) ---');
  r = await get('/api/commands/capabilities');
  const ids = r.body.map((c) => c.id);
  check('Registry lists all 6 capabilities', ids.length === 6);
  check('Registry lists search capability', ids.includes('search'));
  check('Registry lists email capability', ids.includes('email'));
  check('Registry lists calendar capability', ids.includes('calendar'));
  check('Registry lists documents capability', ids.includes('documents'));
  check('Registry lists calls capability', ids.includes('calls'));
  check('Registry lists texts capability', ids.includes('texts'));
  check('search capability is free tier', r.body.find((c) => c.id === 'search').tier === 'free');
  check('email capability is paid tier', r.body.find((c) => c.id === 'email').tier === 'paid');
  check('calendar capability is paid tier', r.body.find((c) => c.id === 'calendar').tier === 'paid');
  check('documents capability is paid tier', r.body.find((c) => c.id === 'documents').tier === 'paid');
  check('calls capability is free tier', r.body.find((c) => c.id === 'calls').tier === 'free');
  check('texts capability is free tier', r.body.find((c) => c.id === 'texts').tier === 'free');

  console.log('--- Command Mapping (Part 3) ---');
  r = await get('/api/commands');
  check('Default mappings pre-populated (all 6 capabilities)', r.body.length === 8);

  r = await post('/api/commands', { triggerPhrase: 'find me a coffee shop', capabilityId: 'search', actionId: 'query' });
  check('New mapping is created', r.status === 201 && r.body.triggerPhrase === 'find me a coffee shop');

  r = await post('/api/commands', { triggerPhrase: 'search for', capabilityId: 'search', actionId: 'query' });
  check('Duplicate trigger phrase is rejected', r.status === 400 && r.body.code === 'DUPLICATE_TRIGGER');

  r = await post('/api/commands', { triggerPhrase: 'do the thing', capabilityId: 'nonexistent', actionId: 'query' });
  check('Unknown capability is rejected', r.status === 400 && r.body.code === 'UNKNOWN_CAPABILITY');

  console.log('--- Resolve-and-run (wake word -> STT -> command -> capability) ---');
  r = await post('/api/commands/resolve-and-run', { spokenText: 'search for pizza near me', userTier: 'free' });
  check('Free-tier search command resolves and runs', r.status === 200 && r.body.matchedCommand.capabilityId === 'search');
  check('Search result carries the remainder text as the query', r.body.result.query === 'pizza near me');

  r = await post('/api/commands/resolve-and-run', { spokenText: 'read my email please', userTier: 'free' });
  check('Free-tier user is blocked from paid capability (402)', r.status === 402 && r.body.code === 'TIER_REQUIRED');

  r = await post('/api/commands/resolve-and-run', { spokenText: 'read my email please', userTier: 'paid' });
  check('Paid-tier user can run the paid capability', r.status === 200 && r.body.matchedCommand.capabilityId === 'email');

  r = await post('/api/commands/resolve-and-run', { spokenText: 'do a backflip', userTier: 'paid' });
  check('Unmatched phrase returns 404', r.status === 404);

  console.log('--- Calendar capability ---');
  r = await post('/api/commands/resolve-and-run', { spokenText: 'set an appointment for tomorrow at 3 PM', userTier: 'paid' });
  check('Paid-tier calendar create resolves and runs', r.status === 200 && r.body.matchedCommand.capabilityId === 'calendar');
  check('Calendar honestly reports not yet connected', r.body.result.implemented === false);

  r = await post('/api/commands/resolve-and-run', { spokenText: 'set an appointment for tomorrow at 3 PM', userTier: 'free' });
  check('Free-tier user is blocked from calendar (402)', r.status === 402 && r.body.code === 'TIER_REQUIRED');

  r = await post('/api/commands/resolve-and-run', { spokenText: 'what is on my calendar', userTier: 'paid' });
  check('Calendar read_today resolves and runs', r.status === 200 && r.body.result.implemented === false);

  console.log('--- Documents capability ---');
  r = await post('/api/commands/resolve-and-run', { spokenText: 'create a document called grocery list', userTier: 'paid' });
  check('Paid-tier documents create resolves and runs', r.status === 200 && r.body.matchedCommand.capabilityId === 'documents');

  console.log('--- Calls capability (free tier, contact resolution only) ---');
  r = await post('/api/commands/resolve-and-run', { spokenText: 'call my wife', userTier: 'free' });
  check('Free-tier calls contact-resolution resolves and runs', r.status === 200 && r.body.matchedCommand.capabilityId === 'calls');
  check('Calls capability is honest about not dialing itself', r.body.result.message.includes('CallKit'));

  console.log('--- Texts capability (free tier, compose only) ---');
  r = await post('/api/commands/resolve-and-run', { spokenText: 'send a text to John saying running late', userTier: 'free' });
  check('Free-tier texts compose resolves and runs', r.status === 200 && r.body.matchedCommand.capabilityId === 'texts');
  check('Texts capability is honest about not sending itself', r.body.result.message.includes('MessageUI'));

} finally {
  server.close();
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
