// calendar.js - PAID TIER capability
// Real Google Calendar API integration for read_today. create_appointment
// still needs a proper natural-language date parser (e.g. chrono-node)
// before it can call the API for real - flagged honestly below rather
// than faked, same as before.

import { getAccessToken } from '../services/googleAuthService.js';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

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
        // Real Google Calendar API call happens here once `when.parsed`
        // is true from a real date/time parser - intentionally not
        // faked in the meantime.
        return {
          implemented: false,
          message: `Calendar capability received "${query}" - date/time parsing not yet implemented, so no event was created.`,
          parsedDateTime: when,
        };
      },
    },
    read_today: {
      description: "Read today's calendar appointments aloud.",
      handler: async (_params, _ctx) => {
        const accessToken = await getAccessToken();

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const url = new URL(CALENDAR_API);
        url.searchParams.set('timeMin', startOfDay.toISOString());
        url.searchParams.set('timeMax', endOfDay.toISOString());
        url.searchParams.set('singleEvents', 'true');
        url.searchParams.set('orderBy', 'startTime');

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(`Calendar API error: ${data.error?.message || res.status}`);
        }

        const events = (data.items || []).map((e) => ({
          summary: e.summary || '(no title)',
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          location: e.location || null,
        }));

        return {
          implemented: true,
          date: startOfDay.toDateString(),
          eventCount: events.length,
          events,
          message: events.length === 0
            ? "You have no appointments today."
            : `You have ${events.length} appointment${events.length === 1 ? '' : 's'} today.`,
        };
      },
    },
  },
};
