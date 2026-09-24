// twilioService.js
// Low-level Twilio REST API client - raw fetch, no SDK (same approach used
// by maps.js for Google Maps). This is the ONE place that knows how to
// talk to Twilio; sms.js and whatsapp.js both call sendTwilioMessage().
//
// AUTH MODEL: uses the Standard API Key you created in the Twilio Console
// (TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET) for Basic Auth - but the
// Account SID in the URL path is always your main Account SID (starts
// with AC). That's how Twilio's API Key auth works: username = Key SID,
// password = Key Secret, resource paths still scoped to your Account SID.
// Requires in .env: TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET

const MESSAGES_API = (accountSid) =>
  `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

function getCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  if (!accountSid || !apiKeySid || !apiKeySecret) return null;
  return { accountSid, apiKeySid, apiKeySecret };
}

// True only when all three required Twilio env vars are present. Never
// logs or returns the actual values.
export function twilioConfigured() {
  return !!getCredentials();
}

// Sends a message (SMS or WhatsApp) through Twilio's REST API.
// For WhatsApp, `to` and `from` must already carry the "whatsapp:" prefix
// - the caller (whatsapp.js) is responsible for that, this function just
// sends whatever it's given.
export async function sendTwilioMessage({ to, from, body }) {
  const creds = getCredentials();
  if (!creds) {
    throw new Error(
      'Twilio is not configured. TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, and TWILIO_API_KEY_SECRET must be set in .env.'
    );
  }
  if (!to) throw new Error('Recipient ("to") is required');
  if (!from) throw new Error('Sender ("from") number is not configured');
  if (!body) throw new Error('Message body is required');

  const auth = Buffer.from(`${creds.apiKeySid}:${creds.apiKeySecret}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(MESSAGES_API(creds.accountSid), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Twilio API error: ${data.message || res.status} (code ${data.code || 'unknown'})`);
  }
  return data;
}
