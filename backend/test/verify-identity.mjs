// Self-contained verification: starts the app in-process, hits every
// identity endpoint, prints results, and shuts down cleanly. No shell
// backgrounding required.
import { createApp } from '../src/app.js';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/identity.json');

// Clean slate for a repeatable test run - overwrite rather than delete,
// since the connected project folder blocks deletion by default.
try { await writeFile(DATA_FILE, '', 'utf-8'); } catch {}

const app = createApp();
const server = app.listen(0); // OS-assigned free port
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

let failures = 0;
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${label}`);
  if (!cond) failures++;
}

try {
  // 1. Health check
  let res = await fetch(`${base}/health`);
  let body = await res.json();
  check('GET /health returns 200', res.status === 200);
  check('GET /health reports status ok', body.status === 'ok');

  // 2. Default identity before anything is set
  res = await fetch(`${base}/api/identity`);
  body = await res.json();
  check('GET /api/identity (fresh) returns 200', res.status === 200);
  check('GET /api/identity (fresh) has null assistantName', body.assistantName === null);

  // 3. Set identity successfully
  res = await fetch(`${base}/api/identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assistantName: 'Juanita', wakePhrase: 'Hey Juanita' }),
  });
  body = await res.json();
  check('POST /api/identity (valid) returns 200', res.status === 200);
  check('POST /api/identity (valid) saves assistantName', body.assistantName === 'Juanita');
  check('POST /api/identity (valid) saves wakePhrase', body.wakePhrase === 'Hey Juanita');
  check('POST /api/identity (valid) sets createdAt', typeof body.createdAt === 'string');

  // 4. Confirm it persisted
  res = await fetch(`${base}/api/identity`);
  body = await res.json();
  check('GET /api/identity (after save) reflects saved data', body.assistantName === 'Juanita');

  // 5. Reject a too-short wake phrase
  res = await fetch(`${base}/api/identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assistantName: 'Juanita', wakePhrase: 'Hi' }),
  });
  body = await res.json();
  check('POST /api/identity (too short wake phrase) returns 400', res.status === 400);
  check('POST /api/identity (too short) includes validation errors', Array.isArray(body.details) && body.details.length > 0);

  // 6. Reject a missing assistant name
  res = await fetch(`${base}/api/identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assistantName: '', wakePhrase: 'Hey Juanita' }),
  });
  check('POST /api/identity (missing name) returns 400', res.status === 400);

} finally {
  server.close();
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
