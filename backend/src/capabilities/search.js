// search.js - FREE TIER capability
// Real implementation stub: swap the handler body for an actual search
// API call (e.g. Bing Web Search API, Google Custom Search) when ready.
// This is a real, working capability shape - not a placeholder that lies
// about doing a search; it clearly returns a "not yet wired" result.

export const searchCapability = {
  id: 'search',
  label: 'Web Search',
  tier: 'free',
  actions: {
    query: {
      description: 'Search the web for a spoken query and return a short spoken-back summary.',
      handler: async ({ query }) => {
        if (!query) throw new Error('query is required');
        // TODO: replace with a real search API call.
        return {
          implemented: false,
          query,
          message: `Search capability received query "${query}" - no search provider connected yet.`,
        };
      },
    },
  },
};
