// whatsapp.js - PAID TIER capability
//
// LAUNCHER, not a sender: this backend does NOT send WhatsApp messages
// itself and does NOT need Twilio, a WhatsApp Business API, or any
// credentials. It only builds a wa.me link with the recipient and your
// message pre-filled. Opening that link launches WhatsApp Web/Desktop/
// Mobile - already signed in to YOUR OWN WhatsApp account on your phone -
// with the chat open and the message typed in. You tap Send yourself.
//
// This is a deliberate architecture choice (per your instruction): the
// phone's own logged-in accounts handle everything past this point, so
// there is nothing to configure, connect, or authorize here.

function toWaMeLink(to, body) {
  if (!to) throw new Error('Recipient ("to") is required');
  // wa.me needs country code + number, digits only (no +, spaces, dashes,
  // parentheses).
  const digits = to.replace(/[^\d]/g, '');
  if (!digits) throw new Error('Recipient phone number has no digits after cleanup');

  const url = new URL(`https://wa.me/${digits}`);
  if (body) url.searchParams.set('text', body);
  return url.toString();
}

export const whatsappCapability = {
  id: 'whatsapp',
  label: 'WhatsApp',
  tier: 'paid',
  actions: {
    send: {
      description: 'Open WhatsApp with a message pre-filled to a contact, ready for you to tap Send.',
      handler: async ({ to, body }, _ctx) => {
        const launchUrl = toWaMeLink(to, body);
        return {
          implemented: true,
          message: `Opening WhatsApp to message ${to} - review and tap Send.`,
          launchUrl,
          requiresUserTap: true,
        };
      },
    },
  },
};
