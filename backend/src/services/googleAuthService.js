// googleAuthService.js
// Google OAuth2 flow (Authorization Code flow) + token persistence.
//
// Implemented with Node's built-in fetch - no google-auth-library
// dependency (that package hangs on import in this project's sandboxed
// dev environment; this flow only needs two plain HTTPS calls anyway).
//
// SCOPE NOTE: this wires up real Google sign-in and stores the resulting
// tokens on disk (data/googleTokens.json - gitignored, not committed).
// It does NOT yet call the Gmail/Calendar APIs themselves - that's the
// next step once a real user has completed this flow once. This service
// is what email.js/calendar.js will pull ctx.userId's stored token from.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.join(__dirname, '../../data/googleTokens.json');

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

// Scopes needed for the paid-tier capabilities (email.js, calendar.js).
// Kept minimal on purpose - request more only when a capability needs it.
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to backend/.env before using Google OAuth.`
    );
  }
  return value;
}

// Builds the URL that sends the user to Google's real consent screen.
export function getAuthUrl() {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID');
  const redirectUri = getRequiredEnv('GOOGLE_REDIRECT_URI');

  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline'); // request a refresh_token
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

// Exchanges the ?code=... Google sends back to /auth/google/callback
// for real access/refresh tokens, and persists them.
export async function handleOAuthCallback(code) {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getRequiredEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = getRequiredEnv('GOOGLE_REDIRECT_URI');

  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(
      `Google token exchange failed: ${tokens.error_description || tokens.error || tokenRes.status}`
    );
  }

  // Fetch the signed-in account's basic profile using the access token
  // (avoids needing to verify the id_token JWT signature ourselves).
  const profileRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();
  if (!profileRes.ok) {
    throw new Error(`Fetching Google profile failed: ${profileRes.status}`);
  }

  await saveTokens({
    email: profile.email,
    tokens,
    obtainedAt: Date.now(),
    updatedAt: new Date().toISOString(),
  });

  return { email: profile.email };
}

async function saveTokens(record) {
  await writeFile(TOKENS_FILE, JSON.stringify(record, null, 2), 'utf-8');
}

export async function getStoredTokens() {
  try {
    const raw = await readFile(TOKENS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Returns a valid access_token for the connected Google account, refreshing
// it first if it has expired. email.js/calendar.js call this before hitting
// the Gmail/Calendar REST APIs directly.
export async function getAccessToken() {
  const record = await getStoredTokens();
  if (!record) {
    throw new Error(
      'No Google account connected yet. Visit /auth/google/login to connect one.'
    );
  }

  const expiresAt = record.obtainedAt + (record.tokens.expires_in || 3600) * 1000;
  const isExpired = Date.now() > expiresAt - 60_000; // refresh a minute early

  if (!isExpired) {
    return record.tokens.access_token;
  }

  if (!record.tokens.refresh_token) {
    throw new Error(
      'Google access token expired and no refresh_token is stored. Reconnect via /auth/google/login.'
    );
  }

  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getRequiredEnv('GOOGLE_CLIENT_SECRET');

  const refreshRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: record.tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const refreshed = await refreshRes.json();
  if (!refreshRes.ok) {
    throw new Error(
      `Google token refresh failed: ${refreshed.error_description || refreshed.error || refreshRes.status}`
    );
  }

  const mergedTokens = { ...record.tokens, ...refreshed };
  await saveTokens({
    email: record.email,
    tokens: mergedTokens,
    obtainedAt: Date.now(),
    updatedAt: new Date().toISOString(),
  });

  return mergedTokens.access_token;
}
