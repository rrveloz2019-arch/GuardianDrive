// texts.js - FREE TIER capability
//
// LAUNCHER, not a sender: this backend does NOT send SMS itself and needs
// no Telephony API or MessageUI integration. It builds an sms: link;
// opening that link on your phone hands off to your phone's own native
// Messages app with the recipient and message body already filled in. You
// tap Send yourself.
//
// KNOWN PLATFORM QUIRK (not a bug here - this is how sms: links work):
// the URL parameter that pre-fills the message body is not fully
// standardized across phones. This uses `?body=`, which works on Android
// and current iOS Safari. On some older iOS versions the body may not
// pre-fill even though the recipient does - if that happens on your
// phone, the Messages app still opens with the right contact, you'd just
// need to type the message yourself.
//
// Contact names ("text my wife") are resolved against your saved Contacts
// the same way calls.js does.

import { resolveContact } from '../services/contactsService.js';

function toSmsLink(phone, body) {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) throw new Error('Phone number has no digits after cleanup');
  let url = `sms:${digits}`;
  if (body) url += `?body=${encodeURIComponent(body)}`;
  return url;
}

export const textsCapability = {
  id: 'texts',
  label: 'Text Messages',
  tier: 'free',
  actions: {
    send: {
      description: 'Resolve a spoken recipient + message and open your phone\'s native Messages app with it ready to send.',
      handler: async ({ query, to, body }, _ctx) => {
        // `query` covers the common voice pattern "text John saying I'm on
        // my way" - split on " saying " into recipient + body if `to`/`body`
        // weren't already supplied structured.
        let phone = to;
        let messageBody = body;
        let resolvedName = null;

        if (!phone && query) {
          const sayingMatch = query.match(/^(.*?)\s+saying\s+(.*)$/i);
          const recipientText = sayingMatch ? sayingMatch[1] : query;
          if (!messageBody && sayingMatch) messageBody = sayingMatch[2];

          const digitCount = (recipientText.match(/\d/g) || []).length;
          if (digitCount >= 7) {
            phone = recipientText;
          } else {
            const contact = await resolveContact(recipientText);
            if (!contact) {
              return {
                implemented: true,
                message: `Couldn't find a contact matching "${recipientText}". Add them in the Contacts tab, or say a phone number directly.`,
                launchUrl: null,
                requiresUserTap: false,
              };
            }
            phone = contact.phone;
            resolvedName = contact.name;
          }
        }

        if (!phone) throw new Error('query (contact name/number, optionally "... saying <message>") or to (phone number) is required');

        const launchUrl = toSmsLink(phone, messageBody);
        return {
          implemented: true,
          message: resolvedName
            ? `Opening Messages to text ${resolvedName} (${phone})${messageBody ? ' - message pre-filled' : ''} - review and tap Send.`
            : `Opening Messages to text ${phone}${messageBody ? ' - message pre-filled' : ''} - review and tap Send.`,
          launchUrl,
          requiresUserTap: true,
        };
      },
    },
  },
};
