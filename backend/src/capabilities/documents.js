// documents.js - PAID TIER capability
// Per your notes: uses Google Docs API for document handling.
// Real implementation stub: swap handlers for actual Google Docs API
// calls once OAuth is wired (shared auth flow with Calendar/Gmail, since
// all three are Google APIs under one Google Workspace OAuth consent).

export const documentsCapability = {
  id: 'documents',
  label: 'Documents',
  tier: 'paid',
  actions: {
    create: {
      description: 'Create a new document from a spoken title and dictated content.',
      handler: async ({ query }, ctx) => {
        if (!query) throw new Error('query (spoken document title/content) is required');
        // TODO: call Google Docs API using ctx.userId's stored OAuth token.
        return {
          implemented: false,
          message: `Documents capability received "${query}" - not yet connected to Google Docs API.`,
        };
      },
    },
    read_latest: {
      description: 'Read the most recently edited document aloud.',
      handler: async (_params, ctx) => {
        // TODO: call Google Docs / Drive API using ctx.userId's stored OAuth token.
        return {
          implemented: false,
          message: 'Documents capability not yet connected to Google Docs API.',
        };
      },
    },
  },
};
