// calendar.js - PAID TIER capability
// Per the business model: calendar scheduling is a paid-tier feature.
// Real implementation stub: swap handlers for Google Calendar API calls
// once OAuth is wired (same auth flow will likely be shared with Gmail).

function parseSpokenDateTime(text) {
  // Very naive placeholder parser - real version needs a proper date/time
  // NLU library (e.g. chrono-node) to handle "tomorrow at 3pm", "next
  // Tuesday", etc. Flagged honestly rather than faked.
  return {
    raw: text,
    parsed: false,
    note: 'Date/time parsing not yet implemented - needs a natural-language date parser (e.g. chrono-node).',
  };
}

export const calendarCapability = {
  id: 'calendar',
  label: 'Calendar',
  tier: 'paid',
  actions: {
    create_appointment: {
      description: 'Create a calendar appointment from a spoken description (e.g. "set an appointment for tomorrow at 3 PM").',
      handler: async ({ query }, ctx) => {
        if (!query) throw new Error('query (the spoken appointment description) is required');
        const when = parseSpokenDateTime(query);
        // TODO: call Google Calendar API using ctx.userId's stored OAuth token,
        // once `when.parsed` is true from a real date/time parser.
        return {
          implemented: false,
          message: `Calendar capability received "${query}" - not yet connected to Google Calendar API.`,
          parsedDateTime: when,
        };
      },
    },
    read_today: {
      description: "Read today's calendar appointments aloud.",
      handler: async (_params, ctx) => {
        // TODO: call Google Calendar API using ctx.userId's stored OAuth token.
        return {
          implemented: false,
          message: 'Calendar capability not yet connected to Google Calendar API.',
        };
      },
    },
  },
};
