// search.js - FREE TIER capability
// Real Google Custom Search JSON API integration.
// Requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in .env
// (the API key from Google Cloud Console, restricted to Custom Search API;
// the engine ID ("cx") from the Programmable Search Engine control panel).

const CUSTOM_SEARCH_API = 'https://www.googleapis.com/customsearch/v1';

export const searchCapability = {
  id: 'search',
  label: 'Web Search',
  tier: 'free',
  actions: {
    query: {
      description: 'Search the web for a spoken query and return a short spoken-back summary.',
      handler: async ({ query }) => {
        if (!query) throw new Error('query is required');

        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!apiKey || !engineId) {
          return {
            implemented: false,
            query,
            message: 'Search capability is missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID in .env - no search provider connected yet.',
          };
        }

        const url = new URL(CUSTOM_SEARCH_API);
        url.searchParams.set('key', apiKey);
        url.searchParams.set('cx', engineId);
        url.searchParams.set('q', query);
        url.searchParams.set('num', '5'); // top 5 results, enough for a spoken summary

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
          const errMessage = data?.error?.message || `HTTP ${response.status}`;
          throw new Error(`Google Custom Search API error: ${errMessage}`);
        }

        const items = (data.items || []).map((item) => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
        }));

        if (items.length === 0) {
          return {
            implemented: true,
            query,
            resultCount: 0,
            message: `No search results found for "${query}".`,
            results: [],
          };
        }

        // Short spoken-back summary: top result's title + snippet.
        const top = items[0];
        const spokenSummary = `Top result for "${query}": ${top.title}. ${top.snippet}`;

        return {
          implemented: true,
          query,
          resultCount: items.length,
          message: spokenSummary,
          results: items,
        };
      },
    },
  },
};
