// secondaryEmail.js - PAID TIER capability (per updated business model)
// Real Outlook / Microsoft 365 integration via the Microsoft Graph API,
// using the OAuth token stored by microsoftAuthService.js
// (see /auth/microsoft/login to connect an account).
//
// This is a SEPARATE, second email account from the free-tier "email"
// capability (which is Gmail/Google only) - useful for anyone who runs a
// work Outlook inbox alongside a personal Gmail one.

import { getAccessToken } from '../services/microsoftAuthService.js';

const GRAPH_API = 'https://graph.microsoft.com/v1.0/me';

export const secondaryEmailCapability = {
  id: 'secondaryEmail',
  label: 'Secondary Email (Outlook / Microsoft 365)',
  tier: 'paid',
  actions: {
    read_latest: {
      description: 'Read the most recent Outlook email aloud.',
      handler: async (_params, _ctx) => {
        const accessToken = await getAccessToken();

        const listRes = await fetch(
          `${GRAPH_API}/mailFolders/inbox/messages?$top=1&$orderby=receivedDateTime desc&$select=from,subject,bodyPreview,body`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const listData = await listRes.json();
        if (!listRes.ok) {
          throw new Error(`Microsoft Graph API error: ${listData.error?.message || listRes.status}`);
        }
        if (!listData.value || listData.value.length === 0) {
          return { implemented: true, message: 'Your Outlook inbox is empty.' };
        }

        const msg = listData.value[0];
        const from = msg.from?.emailAddress?.address || null;
        // body.content may be HTML - strip tags for a clean voice/dashboard
        // readback, same spirit as email.js's plain-text preference.
        const rawBody = msg.body?.content || msg.bodyPreview || '';
        const body = rawBody
          .replace(/<[^>]*>/g, ' ')           // strip HTML tags
          .replace(/&nbsp;/gi, ' ')           // decode common named entities
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'")
          .replace(/\u200b|\u034f/g, '')     // strip zero-width/combining spacer chars
          .replace(/\s+/g, ' ')
          .trim();

        return {
          implemented: true,
          from,
          subject: msg.subject,
          snippet: msg.bodyPreview,
          body: body.slice(0, 2000), // cap for voice/dashboard readback
        };
      },
    },
    send: {
      description: 'Send an Outlook email by voice dictation.',
      handler: async ({ to, subject, body }, _ctx) => {
        if (!to) throw new Error('Recipient ("to") is required');

        const accessToken = await getAccessToken();

        const sendRes = await fetch(`${GRAPH_API}/sendMail`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              subject: subject || '(no subject)',
              body: { contentType: 'Text', content: body || '' },
              toRecipients: [{ emailAddress: { address: to } }],
            },
            saveToSentItems: true,
          }),
        });

        // Graph's sendMail returns 202 Accepted with an EMPTY body on
        // success - unlike Gmail's send, which returns a JSON message
        // object. Only parse JSON on failure.
        if (!sendRes.ok) {
          const errData = await sendRes.json().catch(() => ({}));
          throw new Error(`Microsoft Graph API error: ${errData.error?.message || sendRes.status}`);
        }

        return {
          implemented: true,
          message: `Outlook email sent to ${to}.`,
        };
      },
    },
  },
};
