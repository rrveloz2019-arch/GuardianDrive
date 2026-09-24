// sms.js - FREE TIER capability (per updated business model: calls, SMS, and primary email are free)
// Real SMS sending via the Twilio Messages API. This is DIFFERENT from
// texts.js: texts.js hands a spoken message to the mobile app so it can
// send via the phone's own MessageUI (iOS) / Telephony API (Android).
// THIS capability actually sends the text itself, from your Twilio
// number, with no phone or mobile app involved - useful for the backend/
// dashboard today, before the mobile app exists.
//
// Requires in .env: TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID,
// TWILIO_API_KEY_SECRET, TWILIO_PHONE_NUMBER

import { sendTwilioMessage, twilioConfigured } from '../services/twilioService.js';

export const smsCapability = {
  id: 'sms',
  label: 'SMS (Twilio)',
  tier: 'free',
  actions: {
    send: {
      description: 'Send a real text message via Twilio, from your GuardianDrive number.',
      handler: async ({ to, body }, _ctx) => {
        if (!twilioConfigured()) {
          return {
            implemented: false,
            message: 'SMS is not set up yet - add TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET to .env first.',
          };
        }
        if (!to) throw new Error('Recipient ("to") is required');
        if (!body) throw new Error('Message body is required');

        const from = process.env.TWILIO_PHONE_NUMBER;
        if (!from) throw new Error('TWILIO_PHONE_NUMBER is not set in .env');

        const result = await sendTwilioMessage({ to, from, body });

        return {
          implemented: true,
          message: `Text sent to ${to}.`,
          twilioSid: result.sid,
          status: result.status,
        };
      },
    },
  },
};
