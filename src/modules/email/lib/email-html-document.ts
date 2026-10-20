/**
 * Builds the sandboxed document a message body is rendered inside.
 *
 * Email HTML is hostile in two different ways, and they need two different
 * answers. It is hostile *technically* — a message is arbitrary third-party
 * markup that can carry script — and hostile *stylistically*, because 93% of
 * the bodies in our own cache ship a `<style>` block written for a full page.
 *
 * Previously we answered both with one mechanism: a hand-written denylist
 * sanitizer and a shadow root. A denylist loses to markup it did not
 * anticipate, and a shadow root scopes CSS but gives **no script isolation at
 * all** — anything the sanitizer missed ran with full access to the session.
 *
 * So: DOMPurify does the sanitizing (an allowlist, maintained against the mXSS
 * classes a hand-rolled walker cannot see coming), and a sandboxed iframe does
 * the isolating. The iframe deliberately has no `allow-same-origin`, so even a
 * complete sanitizer bypass runs in an opaque origin with no reach into our
 * cookies, DOM or API — the two layers fail independently.
 *
 * Keeping `<style>` is a deliberate difference from the reference
 * implementation this was modelled on (Cloudflare's agentic-inbox forbids it):
 * stripping stylesheets would flatten almost every message we actually
 * receive. The iframe is what makes keeping them safe.
 */

import { EMAIL_LINK_COLOR, EMAIL_LINK_CSS } from '@/modules/email/lib/email-body-transforms';
import {
  QUOTE_CLOSE_DURATION_MS,
  QUOTE_CLOSE_EASING,
  QUOTE_ELASTIC_EASING,
  QUOTE_ELASTIC_FALLBACK_EASING,
  QUOTE_JELLY_KEYFRAMES,
  QUOTE_OPEN_DURATION_MS,
} from '@/modules/email/lib/email-quote-animation';
import DOMPurify from 'dompurify';

export const EMAIL_QUOTED_CONTENT_ATTRIBUTE = 'data-elli-quoted-content';
export const EMAIL_QUOTE_TOGGLE_ATTRIBUTE = 'data-elli-quote-toggle';
export const EMAIL_IFRAME_HEIGHT_MESSAGE = '__elliEmailHeight';
/**
 * Marks a message carrying one resolved inline image into the frame.
 *
 * Inline images used to arrive by rebuilding the whole `srcdoc` once every one
 * of them had been fetched — so a signature block showed nothing at all until
 * its slowest image landed, and reassigning `srcdoc` reloaded the frame and
 * threw away the reader's scroll position with it. They are posted in one at a
 * time now, and the frame drops each into the `img` already standing in for it.
 */
export const EMAIL_IFRAME_INLINE_IMAGE_MESSAGE = '__elliEmailInlineImage';
/** Sent by the frame once it is listening, so the parent knows when to post. */
export const EMAIL_IFRAME_READY_MESSAGE = '__elliEmailReady';
/**
 * Marks the element the message is wrapped in, which is the thing that gets
 * scaled when a message is wider than the frame.
 *
 * It is a wrapper rather than the body because the body is what the height is
 * measured on, and a scaled element does not report its own size the same way
 * in every browser. Scaling a child leaves the body an ordinary box whose
 * `scrollHeight` means what it always meant.
 */
export const EMAIL_CONTENT_ATTRIBUTE = 'data-elli-email-content';
/**
 * The smallest a message is ever drawn. A 600px newsletter on a phone lands
 * near 0.5, which is what every mobile mail client shows; below this the text
 * is past reading, so the remainder scrolls sideways instead.
 */
export const EMAIL_MIN_FIT_SCALE = 0.4;

/** Carries the inverse of the fit scale, for controls that must stay full size. */
const EMAIL_UNFIT_PROPERTY = '--elli-email-unfit';

/**
 * Interactive form controls are removed even though DOMPurify's html profile
 * permits them. A `<form action="https://…">` with inputs renders as a
 * credential prompt inside a message — the classic phishing payload — and it
 * survives every stock DOMPurify configuration, including the one the
 * reference implementation ships. The iframe CSP blocks the submission too;
 * this is the half that stops it being drawn at all.
 */
const FORBIDDEN_TAGS = ['form', 'input', 'button', 'textarea', 'select', 'option', 'label'];

const SANITIZE_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: FORBIDDEN_TAGS,
  FORBID_ATTR: ['formaction', 'form'],
  // `target` is not in the html profile, and every link in a message needs it.
  ADD_ATTR: ['target'],
  FORCE_BODY: true,
};

/** Sanitize a message body. Exported so the security tests can reach it directly. */
export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Runs inside the sandbox. Three jobs: fit a message wider than the frame into
 * it, report the content height to the parent (the parent cannot measure a
 * cross-origin document itself), and drive the quoted-content toggle, which has
 * to live in here with the content it hides.
 */
const FRAME_SCRIPT = `
(function () {
  var content = document.querySelector('[${EMAIL_CONTENT_ATTRIBUTE}]');
  var quoted = document.querySelector('[${EMAIL_QUOTED_CONTENT_ATTRIBUTE}]');
  var toggle = document.querySelector('[${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}]');
  var canFit = !!content && !!window.CSS && !!CSS.supports && CSS.supports('zoom', '0.5');

  // Most marketing mail is a fixed 600px table. A sender that ships media
  // queries reflows by itself, because the frame is the viewport they test;
  // one that does not simply ran off the right-hand edge of a phone. Scaled
  // down to fit instead, which is what Gmail and Apple Mail do with it.
  function fit() {
    if (!canFit) return;
    // Always measured unscaled, so the answer does not depend on the last one.
    content.style.zoom = '';
    content.style.removeProperty('${EMAIL_UNFIT_PROPERTY}');
    var available = content.clientWidth;
    var natural = content.scrollWidth;
    // A pixel of slack: fractional widths round up into a phantom overflow.
    if (!available || natural <= available + 1) return;
    var scale = Math.max(${EMAIL_MIN_FIT_SCALE}, available / natural);
    content.style.zoom = String(scale);
    content.style.setProperty('${EMAIL_UNFIT_PROPERTY}', String(1 / scale));
  }

  function report() {
    // Measured on the body, never on the root element: documentElement's
    // scrollHeight is clamped to the viewport, so it reported the iframe's own
    // default 150px for every message however long or short the content was.
    var height = document.body.scrollHeight;
    if (height > 0) parent.postMessage({ ${EMAIL_IFRAME_HEIGHT_MESSAGE}: true, height: height }, '*');
  }

  // Fit first: the scale changes the height, so a height taken before it is
  // the height of a layout nobody will see.
  function refresh() {
    fit();
    report();
  }

  // The frame's twin of \`animateQuote\` in \`email-quote-animation.ts\` — see
  // there for why it opens the way it does. The frame cannot import, so the
  // constants are interpolated. Resizing the frame during the animation needs
  // nothing extra: the ResizeObserver below reports every frame of it.
  var quoteAnimations = [];
  function animateQuote(open) {
    var from = quoted.hidden ? 0 : quoted.offsetHeight;
    for (var i = 0; i < quoteAnimations.length; i++) quoteAnimations[i].cancel();
    quoteAnimations = [];
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof quoted.animate !== 'function' || reduced) {
      quoted.hidden = open === false;
      return;
    }
    quoted.hidden = false;
    if (open) {
      var to = quoted.offsetHeight;
      var easing = window.CSS && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)')
        ? ${JSON.stringify(QUOTE_ELASTIC_EASING)}
        : ${JSON.stringify(QUOTE_ELASTIC_FALLBACK_EASING)};
      quoteAnimations = [
        quoted.animate(
          [
            { overflow: 'hidden', boxSizing: 'border-box', height: from + 'px' },
            { overflow: 'hidden', boxSizing: 'border-box', height: to + 'px' }
          ],
          { duration: ${QUOTE_OPEN_DURATION_MS}, easing: easing }
        ),
        quoted.animate(${JSON.stringify(QUOTE_JELLY_KEYFRAMES)}, {
          duration: ${QUOTE_OPEN_DURATION_MS},
          easing: 'ease-out'
        })
      ];
      return;
    }
    var close = quoted.animate(
      [
        { overflow: 'hidden', boxSizing: 'border-box', height: from + 'px', opacity: 1 },
        { overflow: 'hidden', boxSizing: 'border-box', height: '0px', opacity: 0 }
      ],
      { duration: ${QUOTE_CLOSE_DURATION_MS}, easing: ${JSON.stringify(QUOTE_CLOSE_EASING)}, fill: 'forwards' }
    );
    close.onfinish = function () {
      quoted.hidden = true;
      close.cancel();
      quoteAnimations = [];
      refresh();
    };
    quoteAnimations = [close];
  }

  if (toggle && quoted) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      var label = expanded ? 'Show trimmed content' : 'Hide trimmed content';
      animateQuote(!expanded);
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      refresh();
    });
  }

  // Inline images, posted in by the parent as each one is fetched. The frame
  // has a null origin and sends no cookies, so it cannot fetch an authenticated
  // attachment itself — the bytes have to arrive as data.
  window.addEventListener('message', function (event) {
    if (event.source !== parent) return;
    var data = event.data;
    if (!data || data.${EMAIL_IFRAME_INLINE_IMAGE_MESSAGE} !== true) return;
    if (typeof data.cid !== 'string' || typeof data.dataUrl !== 'string') return;
    // Only ever a data: image. Anything else would be a URL this frame would
    // have to authenticate for, which is the thing that does not work here.
    if (data.dataUrl.slice(0, 11) !== 'data:image/') return;

    // Compared rather than built into a selector: a content id is sender-
    // controlled and can hold quotes and backslashes, and escaping those into
    // an attribute selector inside a template literal inside a script string is
    // three layers of escaping to get wrong. A scan has none.
    var candidates = document.querySelectorAll('[data-inline-cid]');
    var applied = 0;
    for (var i = 0; i < candidates.length; i++) {
      var element = candidates[i];
      if (element.getAttribute('data-inline-cid') !== data.cid) continue;
      if (element.tagName === 'SOURCE') element.setAttribute('srcset', data.dataUrl);
      else element.setAttribute('src', data.dataUrl);
      element.removeAttribute('data-missing-inline-image');
      applied++;
    }
    if (applied) refresh();
  });

  refresh();
  // Images and late layout change the size after first paint, and so does the
  // frame itself on a rotated phone; re-measure rather than guessing a
  // settling delay. Re-fitting from here settles: the scale is derived from
  // the unscaled width, so a second pass lands on the same box and the
  // observer has nothing further to report.
  if (window.ResizeObserver) new ResizeObserver(refresh).observe(document.body);
  window.addEventListener('load', refresh);
  // Last, so the parent only starts posting once the listener above is live.
  parent.postMessage({ ${EMAIL_IFRAME_READY_MESSAGE}: true }, '*');
})();
`;

/**
 * The reading surface. Deliberately a fixed light canvas rather than the app
 * theme: a message carries its own colours, written against the white
 * background every mail client renders on, and the previous attempt to
 * reconcile those with a dark UI (a per-element contrast pass that rewrote
 * sender colours) fought the sender's stylesheet on every message. Gmail,
 * Outlook and Cloudflare's client all pin light here for the same reason.
 */
function frameStyles(padding: string): string {
  /* eslint-disable no-restricted-syntax -- a CSS stylesheet for the sandboxed
     frame, not a Tailwind class string. `!important` here overrides the
     sender's own inline styles, which is the entire job of these three rules. */
  return `
* { box-sizing: border-box; }
html {
  background: #ffffff;
  color-scheme: light;
  /* iOS inflates text it judges too small for the column, which undoes the
     fit below one paragraph at a time. */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
/* The same containment the body has, one level in: whatever is scaled has to
   hold its children's margins, or they sit outside it at full size. */
[${EMAIL_CONTENT_ATTRIBUTE}] { display: flow-root; }
body {
  margin: 0;
  padding: ${padding};
  /* Establishes a block formatting context so the first and last child's
     margins are contained rather than collapsing out through the body box.
     Without it the body measures short by exactly those margins — a paragraph
     message reported 132px against 160px of content and had its last line
     sliced in half. Adds no space of its own. */
  display: flow-root;
  background: #ffffff;
  color: #18181b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
  overflow-wrap: break-word;
  overflow-x: auto;
  overflow-y: hidden;
}
/* Word and Outlook write every line — blank ones included — as its own
   paragraph and put a zero margin in the stylesheet, which we drop for being a
   stylesheet. Without it each line collected the browser's default 1em above
   and below, so a five-line message read as though it were double spaced
   (elli-ui#954). Restoring the sender's own metric rather than inventing one:
   Word's spacing comes from its explicit empty paragraphs, not from margins. */
p.MsoNormal, p.MsoPlainText, p.MsoNoSpacing, p.MsoListParagraph,
li.MsoNormal, li.MsoListParagraph, div.MsoNormal {
  margin: 0;
}
img { max-width: 100%; height: auto; }
${EMAIL_LINK_CSS}
table { border-collapse: collapse; max-width: 100%; }
pre { overflow-x: auto; }
/* Senders pin banners and overlays to the viewport; inside a height-reporting
   frame that either escapes the message or collapses its measured height. */
[style*="position: fixed"], [style*="position:fixed"],
[style*="position: absolute"], [style*="position:absolute"] { position: relative !important; }

/* A filled grey chip. It was a hairline outline, on the reasoning that a
   low-emphasis control in this app is a border over the page — but this one is
   not over the page, it is over a *message*, whose own body text is the only
   other thing in the frame. A 1px #e4e4e7 outline on white is the same weight
   as a table rule a sender drew, so the control read as part of the email and
   went unnoticed (elli-ui#993). The fill is what separates it from the
   sender's content: nothing in a message body is painted, so a painted pill is
   unambiguously ours. Same grey as --muted, and the same fill its React twin
   in email-message-body.tsx already carries, so a plain-text message and an
   HTML one show the same control. */
[${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}] {
  /* Its own line, under the reply rather than trailing the last word of it.
     Inline-flex parked the pill against the final character, which read as
     punctuation on the sentence instead of a control over what follows it.
     The width keeps it shrink-wrapped: a block-level flex container would
     otherwise stretch the chip across the message. */
  display: flex;
  /* Undoes the fit scale for this control alone. It is ours, not the
     sender's, and at half size it is a 9px tap target on the one screen
     where a finger is doing the tapping. */
  zoom: var(${EMAIL_UNFIT_PROPERTY}, 1);
  width: fit-content;
  align-items: center;
  gap: 3px;
  height: 18px;
  margin: 6px 0;
  padding: 0 7px;
  border: 0;
  border-radius: 999px;
  background: #f4f4f5;
  color: #71717a;
  cursor: pointer;
  line-height: 0;
  transition:
    background-color 120ms ease,
    color 120ms ease;
}
[${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}]:hover {
  background: #e4e4e7;
  color: #3f3f46;
}
[${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}]:focus-visible { outline: 2px solid ${EMAIL_LINK_COLOR}; outline-offset: 2px; }
[data-elli-quote-dot] { width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
@media (prefers-reduced-motion: reduce) {
  [${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}] { transition: none; }
}

/* The quoted history reads as reference material: one rule down the side, and
   none of the indent that a blockquote-inside-blockquote chain compounds on
   every reply round. Priority beats the sender's inline styles. */
[${EMAIL_QUOTED_CONTENT_ATTRIBUTE}] {
  padding-left: 12px;
  border-left: 2px solid #e4e4e7;
  color: #52525b;
}
[${EMAIL_QUOTED_CONTENT_ATTRIBUTE}] blockquote {
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 0 !important;
  border-left: 0 !important;
}
[${EMAIL_QUOTED_CONTENT_ATTRIBUTE}] hr { display: none !important; }
`;
  /* eslint-enable no-restricted-syntax */
}

/**
 * Content-Security-Policy for the frame, as defence in depth behind DOMPurify.
 *
 * `script-src 'unsafe-inline'` is required by the height reporter above. It is
 * not the security boundary — the sandbox is; without `allow-same-origin` any
 * script in here, ours or a sanitizer bypass, is confined to an opaque origin.
 *
 * `img-src` has to be permissive because message images are third-party by
 * nature, and it names the API origin so inline `cid:` attachments (rewritten
 * to API URLs before this point) load.
 */
function frameCsp(apiOrigin: string | null): string {
  // The app's own origin matters as much as the API's: attachment URLs are
  // relative (`/api/...`) and resolve against the page, which in development is
  // `http://localhost:5173` — not covered by `https:`, so without this the
  // fallback URL is blocked outright.
  const appOrigin = typeof window === 'undefined' ? null : window.location.origin;
  const imageSources = ['data:', 'blob:', 'https:', appOrigin, apiOrigin]
    .filter(Boolean)
    .filter((source, index, all) => all.indexOf(source) === index)
    .join(' ');
  return [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `img-src ${imageSources}`,
    "script-src 'unsafe-inline'",
    'font-src data:',
    "form-action 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join('; ');
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Assemble the full `srcdoc`. `bodyHtml` must already be sanitized and marked
 * (see `sanitizeEmailHtml` and `markQuotedEmailContent`) — this only wraps it.
 */
export function buildEmailFrameDocument(input: {
  bodyHtml: string;
  apiOrigin?: string | null;
  padding?: string;
}): string {
  // Horizontal only. The message card wraps this in its own vertical padding,
  // and a second set here framed a one-line reply in 64px of empty space.
  const padding = input.padding ?? '0 16px';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(frameCsp(input.apiOrigin ?? null))}">
<style>${frameStyles(padding)}</style>
</head>
<body><div ${EMAIL_CONTENT_ATTRIBUTE}>${input.bodyHtml}</div><script>${FRAME_SCRIPT}</script></body>
</html>`;
}

/**
 * Sandbox flags for the frame element.
 *
 * `allow-same-origin` is deliberately absent and must never be added: combined
 * with `allow-scripts` it dissolves the sandbox entirely, which is the whole
 * reason the message is in a frame rather than a shadow root.
 */
export const EMAIL_FRAME_SANDBOX = [
  'allow-scripts',
  'allow-popups',
  // Without this a link opened from the message inherits the sandbox and lands
  // on a page that cannot script itself.
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation-by-user-activation',
].join(' ');
