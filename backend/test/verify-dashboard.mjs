// Verifies the static dashboard is actually served correctly - not just
// that the file exists, but that Express serves it at the right path
// with the right content type, and that it contains the key UI elements
// for all 3 dashboard parts.
import { createApp } from '../src/app.js';

const app = createApp();
const server = app.listen(0);
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

let failures = 0;
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${label}`);
  if (!cond) failures++;
}

try {
  const res = await fetch(`${base}/`);
  const html = await res.text();

  check('GET / returns 200', res.status === 200);
  check('GET / returns HTML content-type', res.headers.get('content-type').includes('text/html'));
  check('Dashboard has a title', html.includes('GuardianDrive Setup Dashboard'));
  check('Dashboard has Part 1 (Identity) tab', html.includes('1. Identity'));
  check('Dashboard has Part 2 (Voice Training) tab', html.includes('2. Voice Training'));
  check('Dashboard has Part 3 (Command Mapping) tab', html.includes('3. Command Mapping'));
  check('Dashboard has assistant name input', html.includes('id="assistantName"'));
  check('Dashboard has wake phrase input', html.includes('id="wakePhrase"'));
  check('Dashboard calls the real identity API', html.includes("/api/identity"));
  check('Dashboard calls the real voice-profile API', html.includes("/api/voice-profile"));
  check('Dashboard calls the real commands API', html.includes("/api/commands"));
} finally {
  server.close();
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
