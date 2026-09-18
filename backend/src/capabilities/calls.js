// calls.js - FREE TIER capability (per your business model: core hands-free
// calls are free tier)
//
// IMPORTANT ARCHITECTURAL NOTE: this backend CANNOT place a phone call by
// itself - that requires the device's own telephony stack. Per your notes:
// iOS uses CallKit, Android uses Telecom/Telephony APIs, and you want
// each platform's NATIVE API rather than a cross-platform calling service.
//
// So this capability's real job on the backend is just: resolve WHO to
// call from a spoken name (e.g. "call my wife" -> look up her number in
// contacts), then hand that phone number back to the mobile app, which
// invokes CallKit/Telecom locally. The actual dialing action happens in
// the iOS/Android app, not here.

export const callsCapability = {
  id: 'calls',
  label: 'Phone Calls',
  tier: 'free',
  actions: {
    resolve_contact_for_call: {
      description: 'Resolve a spoken contact name (e.g. "my wife") to a phone number for the mobile app to dial via CallKit/Telecom.',
      handler: async ({ query }, ctx) => {
        if (!query) throw new Error('query (spoken contact reference) is required');
        // TODO: look up ctx.userId's contacts (synced from device or a
        // contacts API) to resolve "my wife"/a name to an actual number.
        return {
          implemented: false,
          message: `Calls capability received contact reference "${query}" - contact lookup not yet connected. The mobile app must call CallKit (iOS) / Telecom API (Android) directly with the resolved number - this backend never dials calls itself.`,
        };
      },
    },
  },
};
