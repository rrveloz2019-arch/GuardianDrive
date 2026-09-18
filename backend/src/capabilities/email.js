// email.js - PAID TIER capability
// Real implementation stub: swap handlers for actual Gmail API calls
// (per your notes: Gmail for email). Requires OAuth setup + stored
// credentials per user before these can be real - not done yet.

export const emailCapability = {
  id: 'email',
  label: 'Email',
  tier: 'paid',
  actions: {
    read_latest: {
      description: 'Read the most recent email aloud.',
      handler: async (_params, ctx) => {
        // TODO: call Gmail API using ctx.userId's stored OAuth token.
        return {
          implemented: false,
          message: 'Email capability not yet connected to Gmail API.',
        };
      },
    },
    send: {
      description: 'Send an email by voice dictation.',
      handler: async ({ to, subject, body }, ctx) => {
        if (!to) throw new Error('Recipient ("to") is required');
        // TODO: call Gmail API using ctx.userId's stored OAuth token.
        return {
          implemented: false,
          message: `Email capability not yet connected - would send to ${to}.`,
        };
      },
    },
  },
};
