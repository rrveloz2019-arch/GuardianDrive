// texts.js - FREE TIER capability (per your business model: core hands-free
// texts are free tier)
//
// Same architectural note as calls.js: this backend cannot SEND an SMS by
// itself on iOS (Apple restricts programmatic SMS sending - it must go
// through the user-facing MessageUI compose sheet) or reliably on Android
// without the Telephony API running on-device. This capability's real job
// is: turn a spoken message into a structured {recipient, body} the mobile
// app then hands to MessageUI (iOS) / Telephony API (Android).

export const textsCapability = {
  id: 'texts',
  label: 'Text Messages',
  tier: 'free',
  actions: {
    compose: {
      description: 'Compose a text message from spoken recipient + dictated content, for the mobile app to send via MessageUI (iOS) / Telephony API (Android).',
      handler: async ({ query }, ctx) => {
        if (!query) throw new Error('query (spoken message description) is required');
        // TODO: parse "text John saying I'll be 10 minutes late" into
        // { recipient: 'John', body: "I'll be 10 minutes late" } using an
        // NLU step, then resolve 'John' to a number via contacts.
        return {
          implemented: false,
          message: `Texts capability received "${query}" - message parsing and contact resolution not yet connected. The mobile app must send via MessageUI (iOS) / Telephony API (Android) - this backend never sends SMS itself.`,
        };
      },
    },
  },
};
