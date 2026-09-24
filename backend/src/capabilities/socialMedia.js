// socialMedia.js - PAID TIER capability
//
// LAUNCHER, not a poster: this backend does NOT post to any social
// platform itself and needs no API keys, no Meta App Review, and no paid
// X/Twitter API tier. Each action just builds the right URL and hands it
// back; opening that URL uses the account already signed in on your
// phone/browser. You review and tap Post yourself.
//
// IMPORTANT - platform limits (not a bug, a real restriction on each
// platform's side):
//   - X (Twitter): FULL pre-fill support via their official "intent" link.
//   - LinkedIn:     Can pre-fill when sharing a URL. Free-text-only posts
//                    (no link) cannot be pre-filled without LinkedIn's own
//                    approved app - there is no public workaround. Without
//                    a url, this opens your LinkedIn feed for you to paste
//                    the text yourself.
//   - Facebook:      Same limitation as LinkedIn - reliably pre-fills only
//                    when sharing a URL, not free text.
//   - Instagram:     No web link can pre-fill a post at all. This can only
//                    open the Instagram app/site - you compose there.

function requireText(text) {
  if (!text) throw new Error('text is required');
  return text;
}

// Voice commands like "post on x saying hello world" leave "saying hello
// world" as the remainder (the trigger phrase only eats "post on x") -
// strip a leading "saying" so the literal word doesn't end up in the post.
function stripLeadingSaying(text) {
  if (!text) return text;
  return text.replace(/^\s*saying\s+/i, '').trim();
}

export const socialMediaCapability = {
  id: 'socialMedia',
  label: 'Social Media',
  tier: 'paid',
  actions: {
    post_x: {
      description: 'Open X (Twitter) with a post pre-filled, ready for you to tap Post. Fully supported - no limitations.',
      handler: async ({ text, query }, _ctx) => {
        const postText = requireText(text || stripLeadingSaying(query));
        const url = new URL('https://twitter.com/intent/tweet');
        url.searchParams.set('text', postText);
        return {
          implemented: true,
          message: 'Opening X with your post pre-filled - review and tap Post.',
          launchUrl: url.toString(),
          requiresUserTap: true,
        };
      },
    },
    post_linkedin: {
      description: 'Open LinkedIn to share a link (pre-filled) or, for text-only posts, opens your feed for you to paste the text yourself - LinkedIn does not allow pre-filling free text.',
      handler: async ({ text, query, url: shareUrl }, _ctx) => {
        const postText = text || stripLeadingSaying(query);
        if (shareUrl) {
          const url = new URL('https://www.linkedin.com/sharing/share-offsite/');
          url.searchParams.set('url', shareUrl);
          return {
            implemented: true,
            message: 'Opening LinkedIn to share your link - review and tap Post.',
            launchUrl: url.toString(),
            requiresUserTap: true,
          };
        }
        requireText(postText);
        return {
          implemented: true,
          message: 'LinkedIn does not support pre-filling a text-only post via a link - opening your feed instead. Paste your text into the post box yourself.',
          launchUrl: 'https://www.linkedin.com/feed/',
          requiresUserTap: true,
          textToPaste: postText,
          limitation: 'LinkedIn free-text pre-fill is not possible without their approved app - this is a LinkedIn platform restriction, not a bug here.',
        };
      },
    },
    post_facebook: {
      description: 'Open Facebook to share a link (pre-filled) or, for text-only posts, opens Facebook for you to type the post yourself - Facebook does not reliably allow pre-filling free text.',
      handler: async ({ text, query, url: shareUrl }, _ctx) => {
        const postText = text || stripLeadingSaying(query);
        if (shareUrl) {
          const url = new URL('https://www.facebook.com/sharer/sharer.php');
          url.searchParams.set('u', shareUrl);
          if (postText) url.searchParams.set('quote', postText); // best-effort - Facebook may ignore this
          return {
            implemented: true,
            message: 'Opening Facebook to share your link - review and tap Post.',
            launchUrl: url.toString(),
            requiresUserTap: true,
          };
        }
        requireText(postText);
        return {
          implemented: true,
          message: 'Facebook does not reliably support pre-filling a text-only post via a link - opening Facebook instead. Type your post yourself.',
          launchUrl: 'https://www.facebook.com/',
          requiresUserTap: true,
          textToPaste: postText,
          limitation: 'Facebook free-text pre-fill is unreliable/blocked without their approved app - this is a Facebook platform restriction, not a bug here.',
        };
      },
    },
    open_instagram: {
      description: 'Open Instagram for you to compose a post - Instagram has no web link that can pre-fill any content at all.',
      handler: async ({ text, query }, _ctx) => {
        const postText = text || stripLeadingSaying(query);
        return {
          implemented: true,
          message: 'Instagram has no way to pre-fill a post via a link - opening Instagram for you to compose it yourself.',
          launchUrl: 'https://www.instagram.com/',
          requiresUserTap: true,
          textToPaste: postText || null,
          limitation: 'Instagram blocks any form of content pre-fill via web link - this is an Instagram platform restriction, not a bug here.',
        };
      },
    },
  },
};
