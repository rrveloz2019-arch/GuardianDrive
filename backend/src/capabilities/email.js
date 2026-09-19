// email.js - PAID TIER capability
// Real Gmail API integration using the OAuth token stored by
// googleAuthService.js (see /auth/google/login to connect an account).

import { getAccessToken } from '../services/googleAuthService.js';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

function decodeBase64Url(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function encodeBase64Url(str) {
  return Buffer.from(str, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getHeader(headers, name) {
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

// Walks a Gmail message payload to find the first text/plain (or
// text/html as fallback) body part and decode it.
function extractBody(payload) {
  if (!payload) return '';
  if (payload.body?.data && (payload.mimeType === 'text/plain' || payload.mimeType === 'text/html')) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    const plain = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeBase64Url(plain.body.data);
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  return '';
}

export const emailCapability = {
  id: 'email',
  label: 'Email',
  tier: 'paid',
  actions: {
    read_latest: {
      description: 'Read the most recent email aloud.',
      handler: async (_params, _ctx) => {
        const accessToken = await getAccessToken();

        const listRes = await fetch(`${GMAIL_API}/messages?maxResults=1&labelIds=INBOX`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const listData = await listRes.json();
        if (!listRes.ok) {
          throw new Error(`Gmail API error: ${listData.error?.message || listRes.status}`);
        }
        if (!listData.messages || listData.messages.length === 0) {
          return { implemented: true, message: 'Your inbox is empty.' };
        }

        const messageId = listData.messages[0].id;
        const msgRes = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const msg = await msgRes.json();
        if (!msgRes.ok) {
          throw new Error(`Gmail API error: ${msg.error?.message || msgRes.status}`);
        }

        const from = getHeader(msg.payload.headers, 'From');
        const subject = getHeader(msg.payload.headers, 'Subject');
        const body = extractBody(msg.payload) || msg.snippet || '';

        return {
          implemented: true,
          from,
          subject,
          snippet: msg.snippet,
          body: body.slice(0, 2000), // cap for voice/dashboard readback
        };
      },
    },
    send: {
      description: 'Send an email by voice dictation.',
      handler: async ({ to, subject, body }, _ctx) => {
        if (!to) throw new Error('Recipient ("to") is required');

        const accessToken = await getAccessToken();

        const rawMessage = [
          `To: ${to}`,
          `Subject: ${subject || '(no subject)'}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          body || '',
        ].join('\r\n');

        const sendRes = await fetch(`${GMAIL_API}/messages/send`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
        });
        const sendData = await sendRes.json();
        if (!sendRes.ok) {
          throw new Error(`Gmail API error: ${sendData.error?.message || sendRes.status}`);
        }

        return {
          implemented: true,
          message: `Email sent to ${to}.`,
          gmailMessageId: sendData.id,
        };
      },
    },
  },
};
