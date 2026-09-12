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

import DOMPurify from 'dompurify';

export const EMAIL_QUOTED_CONTENT_ATTRIBUTE = 'data-elli-quoted-content';
export const EMAIL_QUOTE_TOGGLE_ATTRIBUTE = 'data-elli-quote-toggle';
export const EMAIL_IFRAME_HEIGHT_MESSAGE = '__elliEmailHeight';

const EMAIL_LINK_COLOR = '#2563eb';

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
 * Runs inside the sandbox. Two jobs: report the content height to the parent
 * (the parent cannot measure a cross-origin document itself), and drive the
 * quoted-content toggle, which has to live in here with the content it hides.
 */
const FRAME_SCRIPT = `
(function () {
  var quoted = document.querySelector('[${EMAIL_QUOTED_CONTENT_ATTRIBUTE}]');
  var toggle = document.querySelector('[${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}]');

  function report() {
    // Measured on the body, never on the root element: documentElement's
    // scrollHeight is clamped to the viewport, so it reported the iframe's own
    // default 150px for every message however long or short the content was.
    var height = document.body.scrollHeight;
    if (height > 0) parent.postMessage({ ${EMAIL_IFRAME_HEIGHT_MESSAGE}: true, height: height }, '*');
  }

  if (toggle && quoted) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      var label = expanded ? 'Show trimmed content' : 'Hide trimmed content';
      quoted.hidden = expanded;
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      report();
    });
  }

  report();
  // Images and late layout change the height after first paint; re-measure
  // rather than guessing a settling delay.
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
  window.addEventListener('load', report);
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
html { background: #ffffff; color-scheme: light; }
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
img { max-width: 100%; height: auto; }
a { color: ${EMAIL_LINK_COLOR}; text-decoration: underline; text-underline-offset: 2px; }
table { border-collapse: collapse; max-width: 100%; }
pre { overflow-x: auto; }
/* Senders pin banners and overlays to the viewport; inside a height-reporting
   frame that either escapes the message or collapses its measured height. */
[style*="position: fixed"], [style*="position:fixed"],
[style*="position: absolute"], [style*="position:absolute"] { position: relative !important; }

/* An outline, not a filled chip. A solid grey pill reads as a piece of the
   message — it has more visual weight than the sentence it sits under — and it
   matches nothing else in the app, where a low-emphasis control is a hairline
   border over the page. Same border colour as the quoted block below, so the
   toggle and the history it opens are visibly one thing. It stays quiet until
   the pointer is on it. */
[${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}] {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  margin: 6px 0;
  padding: 0 7px;
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  line-height: 0;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
}
[${EMAIL_QUOTE_TOGGLE_ATTRIBUTE}]:hover {
  border-color: #d4d4d8;
  background: #fafafa;
  color: #52525b;
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
<body>${input.bodyHtml}<script>${FRAME_SCRIPT}</script></body>
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
