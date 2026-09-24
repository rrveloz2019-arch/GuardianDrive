// routes/microsoftAuth.js
// Microsoft OAuth2 sign-in flow for the "secondary email" (Outlook /
// Microsoft 365) paid-tier capability: /auth/microsoft/login -> Microsoft
// consent screen -> /auth/microsoft/callback (must match
// MICROSOFT_REDIRECT_URI in .env and the redirect URI registered in the
// Azure App Registration for this app). Mirrors routes/auth.js
// (the Google flow) exactly, on separate paths and a separate token file.

import { Router } from 'express';
import {
  getAuthUrl,
  handleOAuthCallback,
  getStoredTokens,
} from '../services/microsoftAuthService.js';

const router = Router();

// GET /auth/microsoft/login - redirects the browser to Microsoft's real
// sign-in/consent screen.
router.get('/login', (req, res) => {
  try {
    const url = getAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/microsoft/callback - Microsoft redirects here with ?code=...
// after the user approves. Exchanges the code for tokens and stores them.
router.get('/callback', async (req, res) => {
  const { code, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.status(400).json({
      error: `Microsoft returned an error: ${error}`,
      details: errorDescription || null,
    });
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing "code" query parameter from Microsoft.' });
  }

  try {
    const { email } = await handleOAuthCallback(code);
    res.send(
      `<html><body style="font-family:sans-serif;padding:2rem">` +
        `<h2>Outlook / Microsoft 365 account connected</h2>` +
        `<p>Signed in as <strong>${email}</strong>. You can close this tab and return to GuardianDrive.</p>` +
        `</body></html>`
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/microsoft/status - lets the dashboard check if an account is
// already connected, without exposing the tokens themselves.
router.get('/status', async (req, res) => {
  const record = await getStoredTokens();
  if (!record) {
    return res.json({ connected: false });
  }
  res.json({ connected: true, email: record.email, updatedAt: record.updatedAt });
});

export default router;
