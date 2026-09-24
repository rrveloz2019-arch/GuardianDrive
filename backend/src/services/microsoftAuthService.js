// microsoftAuthService.js
// Microsoft identity platform OAuth2 flow (Authorization Code flow) for
// Outlook / Microsoft 365 - mirrors googleAuthService.js exactly, but talks
// to Microsoft's endpoints and stores tokens in a SEPARATE file so this
// never collides with the Google (primary email) connection.
//
// Implemented with Node's built-in fetch - no MSAL dependency, same
// reasoning as googleAuthService.js (keep it to two plain HTTPS calls).
//
// SCOPE NOTE: this wires up real Microsoft sign-in and stores the
// resulting tokens on disk (data/microsoftTokens.json - gitignored, not
// committed). secondaryEmail.js pulls the token from here to call the
// Microsoft Graph API (Outlook Mail).

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.join(__dirname, '../../data/microsoftTokens.json');

// "common" = accepts BOTH personal Microsoft accounts (outlook.com,
// hotmail.com, live.com) AND work/school Microsoft 365 accounts - the
// right choice for a general "connect your Outlook" flow.
const MS_AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_ME_ENDPOINT = 'https://graph.microsoft.com/v1.0/me';

// Scopes needed for the paid-tier secondary-email capability.
export const MICROSOFT_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access', // required to get a refresh_token back
  'User.Read', // required to call graph.microsoft.com/v1.0/me - openid/profile
               // alone are OIDC scopes for the ID token and do NOT grant
               // Graph API access to /me (that's what caused the 403 here).
  'Mail.Read',
  'Mail.Send',
];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to backend/.env before using Outlook/Microsoft 365.`
    );
  }
  return value;
}

// Builds the URL that sends the user to Microsoft's real consent screen.
export function getAuthUrl() {
  const clientId = getRequiredEnv('MICROSOFT_CLIENT_ID');
  const redirectUri = getRequiredEnv('MICROSOFT_REDIRECT_URI');

  const url = new URL(MS_AUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', MICROSOFT_SCOPES.join(' '));
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

// Exchanges the ?code=... Microsoft sends back to
// /auth/microsoft/callback for real access/refresh tokens, and persists
// them.
export async function handleOAuthCallback(code) {
  const clientId = getRequiredEnv('MICROSOFT_CLIENT_ID');
  const clientSecret = getRequiredEnv('MICROSOFT_CLIENT_SECRET');
  const redirectUri = getRequiredEnv('MICROSOFT_REDIRECT_URI');

  const tokenRes = await fetch(MS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: MICROSOFT_SCOPES.join(' '),
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(
      `Microsoft token exchange failed: ${tokens.error_description || tokens.error || tokenRes.status}`
    );
  }

  // Fetch the signed-in account's basic profile via Graph.
  const profileRes = await fetch(GRAPH_ME_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();
  if (!profileRes.ok) {
    throw new Error(`Fetching Microsoft profile failed: ${profileRes.status}`);
  }

  const email = profile.mail || profile.userPrincipalName;

  await saveTokens({
    email,
    tokens,
    obtainedAt: Date.now(),
    updatedAt: new Date().toISOString(),
  });

  return { email };
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

// Returns a valid access_token for the connected Microsoft account,
// refreshing it first if it has expired. secondaryEmail.js calls this
// before hitting the Microsoft Graph API directly.
export async function getAccessToken() {
  const record = await getStoredTokens();
  if (!record) {
    throw new Error(
      'No Outlook/Microsoft 365 account connected yet. Visit /auth/microsoft/login to connect one.'
    );
  }

  const expiresAt = record.obtainedAt + (record.tokens.expires_in || 3600) * 1000;
  const isExpired = Date.now() > expiresAt - 60_000; // refresh a minute early

  if (!isExpired) {
    return record.tokens.access_token;
  }

  if (!record.tokens.refresh_token) {
    throw new Error(
      'Microsoft access token expired and no refresh_token is stored. Reconnect via /auth/microsoft/login.'
    );
  }

  const clientId = getRequiredEnv('MICROSOFT_CLIENT_ID');
  const clientSecret = getRequiredEnv('MICROSOFT_CLIENT_SECRET');

  const refreshRes = await fetch(MS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: record.tokens.refresh_token,
      grant_type: 'refresh_token',
      scope: MICROSOFT_SCOPES.join(' '),
    }),
  });
  const refreshed = await refreshRes.json();
  if (!refreshRes.ok) {
    throw new Error(
      `Microsoft token refresh failed: ${refreshed.error_description || refreshed.error || refreshRes.status}`
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
