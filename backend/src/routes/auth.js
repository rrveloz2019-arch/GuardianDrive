// routes/auth.js
// Google OAuth2 sign-in flow: /auth/google/login -> Google consent screen
// -> /auth/google/callback (must match GOOGLE_REDIRECT_URI in .env and the
// redirect URI registered in Google Cloud Console for this client).

import { Router } from 'express';
import {
  getAuthUrl,
  handleOAuthCallback,
  getStoredTokens,
} from '../services/googleAuthService.js';

const router = Router();

// GET /auth/google/login - redirects the browser to Google's real
// sign-in/consent screen.
router.get('/login', (req, res) => {
  try {
    const url = getAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/google/callback - Google redirects here with ?code=...
// after the user approves. Exchanges the code for tokens and stores them.
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: `Google returned an error: ${error}` });
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing "code" query parameter from Google.' });
  }

  try {
    const { email } = await handleOAuthCallback(code);
    res.send(
      `<html><body style="font-family:sans-serif;padding:2rem">` +
        `<h2>Google account connected</h2>` +
        `<p>Signed in as <strong>${email}</strong>. You can close this tab and return to GuardianDrive.</p>` +
        `</body></html>`
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/google/status - lets the dashboard check if an account is
// already connected, without exposing the tokens themselves.
router.get('/status', async (req, res) => {
  const record = await getStoredTokens();
  if (!record) {
    return res.json({ connected: false });
  }
  res.json({ connected: true, email: record.email, updatedAt: record.updatedAt });
});

export default router;
