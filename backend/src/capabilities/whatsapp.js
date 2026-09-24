// whatsapp.js - PAID TIER capability
// Real WhatsApp sending via the Twilio Messages API.
//
// IMPORTANT - Sandbox limitation: until you complete Twilio's WhatsApp
// Sandbox "join" step (texting the join code shown in Twilio Console >
// Messaging > Try it out > Send a WhatsApp message, from your own phone,
// to the Sandbox number), Twilio will REJECT messages to any recipient
// number that hasn't joined the sandbox. That is a Twilio/WhatsApp
// platform rule, not a bug in this code - it applies to every Twilio
// account until you get a production WhatsApp sender approved.
//
// Requires in .env: TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID,
// TWILIO_API_KEY_SECRET
// Optional in .env: TWILIO_WHATSAPP_NUMBER (your own approved WhatsApp
// sender, once you have one). If not set, this falls back to Twilio's
// public Sandbox number (+14155238886) automatically.

import { sendTwilioMessage, twilioConfigured } from '../services/twilioService.js';

const SANDBOX_NUMBER = '+14155238886'; // Twilio's public WhatsApp Sandbox number

function toWhatsApp(number) {
  if (!number) return number;
  return number.startsWith('whatsapp:') ? number : `whatsapp:${number}`;
}

export const whatsappCapability = {
  id: 'whatsapp',
  label: 'WhatsApp (Twilio)',
  tier: 'paid',
  actions: {
    send: {
      description: 'Send a WhatsApp message via Twilio.',
      handler: async ({ to, body }, _ctx) => {
        if (!twilioConfigured()) {
          return {
            implemented: false,
            message: 'WhatsApp is not set up yet - add TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET to .env first.',
          };
        }
        if (!to) throw new Error('Recipient ("to") is required');
        if (!body) throw new Error('Message body is required');

        const usingSandbox = !process.env.TWILIO_WHATSAPP_NUMBER;
        const from = toWhatsApp(process.env.TWILIO_WHATSAPP_NUMBER || SANDBOX_NUMBER);

        const result = await sendTwilioMessage({ to: toWhatsApp(to), from, body });

        return {
          implemented: true,
          message: `WhatsApp message sent to ${to}.${usingSandbox ? ' (sent via Twilio Sandbox - the recipient must have joined the sandbox first, or this will fail)' : ''}`,
          twilioSid: result.sid,
          status: result.status,
          usingSandbox,
        };
      },
    },
  },
};
