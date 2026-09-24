// calls.js - FREE TIER capability
//
// LAUNCHER, not a dialer: this backend does NOT place phone calls itself
// and needs no telephony API, CallKit, or Telecom integration. It builds a
// tel: link; opening that link on your phone (from this dashboard installed
// as a home-screen app, or from a normal browser tab) hands off to your
// phone's own native Phone app with the number already entered. You tap
// Call yourself.
//
// If you say a name instead of a number ("call my wife"), it's resolved
// against your saved Contacts (see contactsService.js / the Contacts tab)
// before building the link.

import { resolveContact } from '../services/contactsService.js';

function toTelLink(phone) {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) throw new Error('Phone number has no digits after cleanup');
  return `tel:${digits}`;
}

export const callsCapability = {
  id: 'calls',
  label: 'Phone Calls',
  tier: 'free',
  actions: {
    call: {
      description: 'Resolve a spoken contact name or phone number and open your phone\'s native dialer with it ready to call.',
      handler: async ({ query, to }, _ctx) => {
        // Accept either a direct number (`to`) or a spoken reference
        // (`query`, e.g. "my wife") to resolve against saved contacts.
        let phone = to;
        let resolvedName = null;

        if (!phone && query) {
          // If the spoken text already looks like a phone number, use it
          // directly; otherwise try to resolve it as a contact name.
          const digitCount = (query.match(/\d/g) || []).length;
          if (digitCount >= 7) {
            phone = query;
          } else {
            const contact = await resolveContact(query);
            if (!contact) {
              return {
                implemented: true,
                message: `Couldn't find a contact matching "${query}". Add them in the Contacts tab, or say a phone number directly.`,
                launchUrl: null,
                requiresUserTap: false,
              };
            }
            phone = contact.phone;
            resolvedName = contact.name;
          }
        }

        if (!phone) throw new Error('query (contact name or phone number) or to (phone number) is required');

        const launchUrl = toTelLink(phone);
        return {
          implemented: true,
          message: resolvedName
            ? `Opening your phone app to call ${resolvedName} (${phone}).`
            : `Opening your phone app to call ${phone}.`,
          launchUrl,
          requiresUserTap: true,
        };
      },
    },
  },
};
