// routes/profile.js
// Single consolidated status view for the new "Profile" dashboard tab -
// so you don't have to hunt across tabs to see what's connected/configured.
// Every field here reflects a REAL check (an env var present, a token on
// disk) - nothing here is a fake "coming soon" toggle that looks live.

import { Router } from 'express';
import { getStoredTokens } from '../services/googleAuthService.js';
import { getStoredTokens as getStoredMicrosoftTokens } from '../services/microsoftAuthService.js';

const router = Router();

router.get('/status', async (req, res) => {
  const googleRecord = await getStoredTokens();
  const microsoftRecord = await getStoredMicrosoftTokens();

  res.json({
    email: {
      // Google account used for both email AND calendar capabilities
      connected: !!googleRecord,
      account: googleRecord ? googleRecord.email : null,
      connectUrl: '/auth/google/login',
    },
    search: {
      configured: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID),
      note: 'Google Custom Search API key + Search Engine ID in .env',
    },
    maps: {
      configured: !!process.env.GOOGLE_MAPS_API_KEY,
      note: 'Google Maps Platform API key in .env (Geocoding + Directions)',
    },
    whatsapp: {
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET),
      // Real, already-verified fact (via Twilio CLI), but not yet wired into
      // this backend - stated plainly rather than shown as "connected".
      note: process.env.TWILIO_ACCOUNT_SID
        ? 'Twilio credentials found in .env.'
        : 'Not set up yet. Your Twilio account is verified (number +1 866-902-1023 confirmed via CLI), but no credentials are in .env yet and no WhatsApp/SMS capability is built into the app yet.',
    },
    sms: {
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_PHONE_NUMBER),
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      note: process.env.TWILIO_PHONE_NUMBER
        ? `Outbound caller ID / SMS number: ${process.env.TWILIO_PHONE_NUMBER}`
        : 'Not set up yet - same Twilio work as WhatsApp above.',
    },
    secondaryEmail: {
      // Outlook / Microsoft 365 - a SEPARATE account connection from the
      // free-tier Google "email" row above (paid tier).
      connected: !!microsoftRecord,
      account: microsoftRecord ? microsoftRecord.email : null,
      connectUrl: '/auth/microsoft/login',
      note: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_REDIRECT_URI)
        ? (microsoftRecord ? undefined : 'Azure app credentials are in .env - visit /auth/microsoft/login to connect an Outlook account.')
        : 'Not set up yet. Add MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET and MICROSOFT_REDIRECT_URI to .env first (Azure App Registration).',
    },
  });
});

export default router;
