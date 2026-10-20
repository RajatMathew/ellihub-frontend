import {
  getEmailCid,
  getEmailInlineImageCid,
  getInlineEmailImageSources,
  loadInlineEmailImageData,
  resolveZohoInlineImageUrl,
  type EmailAttachmentMetadata,
} from '@/modules/email/lib/email-attachments';
import {
  collectVisibleContentIds,
  EMAIL_LINK_COLOR,
  EMAIL_LINK_CSS,
  linkifyTextNodes,
} from '@/modules/email/lib/email-body-transforms';
import { markDateMentions } from '@/modules/email/lib/email-date-mentions';
import { animateQuote } from '@/modules/email/lib/email-quote-animation';
import {
  markQuotedEmailContent,
  QUOTE_TOGGLE_ATTRIBUTE,
  QUOTED_CONTENT_ATTRIBUTE,
} from '@/modules/email/lib/email-quoted-content';
import type { ResourceLifetime } from '@/modules/email/lib/email-renderer/browser';
import { prepareEmailBody, type PreparedEmailBody } from '@/modules/email/lib/email-renderer/core';

/**
 *
 *   raw HTML
 *     → prepareRawEmailHtml       Zoho + cid sources, while `data-*` still exists
 *     → prepareEmailBody (Macro)  sanitize; `showQuotedContent: true` so it
 *                                 leaves quotes and signatures to us
 *     → markPreparedEmailHtml     cid markers, linkify, our quote toggle
 *     → mountEmailBody (Macro)    shadow root
 *         → activateEmailBody     inline images + quote toggle clicks
 */

export type ShadowEmailBody = {
  /** Ready for `mountEmailBody`, with our stylesheet prepended. */
  body: PreparedEmailBody;
  /** Content ids referenced by images the reader can actually see. */
  visibleContentIds: string[];
  /** Whether Macro's colour adaptation should run — see `shouldAdaptEmailColors`. */
  adaptColors: boolean;
};

/**
 * Macro adapts a message when it is personal **or** has no tables. It knows
 * "personal" from Gmail labels and its own sender list; we do not, and the
 * table rule alone kept almost every business mail on white — Outlook builds
 * signatures and logo rows out of tables.
 *
 * Our stand-in for "personal": the message is part of a conversation, i.e. our
 * quote detection found quoted history below the reply. A newsletter has none;
 * a forwarded one would be adapted, which is the accepted trade-off.
 */
export function shouldAdaptEmailColors({
  hasTable,
  hasQuotedContent,
}: {
  hasTable: boolean;
  hasQuotedContent: boolean;
}): boolean {
  return !hasTable || hasQuotedContent;
}

/** Every step before mounting, in the order above. */
export function prepareShadowEmailBody(
  html: string,
  inlineImageBaseUrl?: string | null,
  /** The message's date, when written dates should be marked (elli-ui#686). */
  dateReference?: Date | null
): ShadowEmailBody {
  const body = prepareEmailBody(
    { html: prepareRawEmailHtml(html, inlineImageBaseUrl) },
    // Quotes and signatures are ours to collapse (`markQuotedEmailContent`);
    // without this Macro would delete signatures before we saw them.
    // `fullContentOnly`: we never read `hasHiddenContent`, so clean once, not three times.
    { showQuotedContent: true, fullContentOnly: true }
  );
  const marked = markPreparedEmailHtml(body.html, dateReference);
  return {
    body: { ...body, html: `<style>${EMAIL_SHADOW_BODY_CSS}</style>${marked.html}` },
    visibleContentIds: marked.visibleContentIds,
    adaptColors: shouldAdaptEmailColors({
      hasTable: body.hasTable,
      hasQuotedContent: marked.hasQuotedContent,
    }),
  };
}

/**
 * Resolve image sources that live in attributes Macro's sanitizer strips.
 *
 * Zoho keeps an inline image's real address in `data-originalsrc`, and some
 * clients put a `cid:` there too. The sanitizer drops every `data-*`
 * attribute, so both are copied into `src` first — a Zoho image becomes its
 * API URL, a cid image becomes `src="cid:…"`, which the sanitizer keeps.
 *
 * Parsing untrusted markup with `DOMParser` is inert: nothing runs and nothing
 * loads. Bodies with nothing to resolve are returned untouched.
 */
export function prepareRawEmailHtml(html: string, inlineImageBaseUrl?: string | null): string {
  if (!/cid:|ImageDisplay/i.test(html)) return html;

  const document = new DOMParser().parseFromString(html, 'text/html');
  let changed = false;

  document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const zohoSource = [
      image.getAttribute('src'),
      image.getAttribute('originalsrc'),
      image.getAttribute('data-originalsrc'),
      image.getAttribute('data-original-src'),
    ]
      .map((source) => resolveZohoInlineImageUrl(source, inlineImageBaseUrl))
      .find(Boolean);
    if (zohoSource) {
      image.setAttribute('src', zohoSource);
      image.removeAttribute('srcset');
      image.setAttribute('referrerpolicy', 'no-referrer');
      changed = true;
      return;
    }

    const cid = getEmailInlineImageCid({
      src: image.getAttribute('src'),
      srcset: image.getAttribute('srcset'),
      originalSrc: image.getAttribute('originalsrc'),
      dataOriginalSrc:
        image.getAttribute('data-originalsrc') ?? image.getAttribute('data-original-src'),
    });
    if (!cid) return;
    image.setAttribute('src', `cid:${cid}`);
    image.removeAttribute('srcset');
    changed = true;
  });

  return changed ? document.documentElement.outerHTML : html;
}

export type MarkedEmailHtml = {
  html: string;
  /** Content ids referenced by images the reader can actually see. */
  visibleContentIds: string[];
  /** Our quote detection found quoted history and collapsed it behind the toggle. */
  hasQuotedContent: boolean;
};

/**
 * Our transforms, on HTML Macro has already sanitized. Nodes added here — the
 * quote toggle is a `<button>` — are never fed back through the sanitizer.
 */
export function markPreparedEmailHtml(
  preparedHtml: string,
  dateReference?: Date | null
): MarkedEmailHtml {
  // Explicit `<body>` keeps a leading `<style>` in the body instead of being
  // hoisted into `<head>` and lost when the body is serialized back out.
  const document = new DOMParser().parseFromString(`<body>${preparedHtml}</body>`, 'text/html');

  markInlineImages(document);
  linkifyTextNodes(document);
  const quoted = markQuotedEmailContent(document);
  // After the quote is found, so its relative dates — another email's — are left alone.
  if (dateReference) markDateMentions(document, dateReference, `[${QUOTED_CONTENT_ATTRIBUTE}]`);

  return {
    html: document.body.innerHTML,
    visibleContentIds: collectVisibleContentIds(document),
    hasQuotedContent: quoted !== null,
  };
}

/**
 * A `cid:` image is left sourceless until its data arrives. The browser cannot
 * load `cid:` itself, and an attachment URL needs the fetch in
 * `loadInlineEmailImageData` — so either way it would draw a broken image.
 */
function markInlineImages(document: Document) {
  document.body.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const cid = getEmailCid(image.getAttribute('src'));
    if (!cid) return;
    image.setAttribute('data-inline-cid', cid);
    image.setAttribute('data-missing-inline-image', cid);
    image.removeAttribute('src');
  });
}

export type ActivateEmailBodyInput = {
  attachments: readonly EmailAttachmentMetadata[];
  apiBaseUrl: string;
  visibleContentIds: readonly string[];
};

/** Lets the component hand over attachments that arrive after the body mounted. */
export type InlineImageActivation = {
  setAttachments(attachments: readonly EmailAttachmentMetadata[]): void;
};

/**
 * Runs as the renderer's `resolveImages` hook: points the visible inline images
 * at their attachment URLs, and wires the quote toggle, which does the same for
 * the images behind it on first open.
 *
 * The URL goes straight on the `img`. Inside the shadow root the request is the
 * page's own, so it carries the session cookie, and the browser loads images in
 * parallel, caches them and defers the offscreen ones. The sandboxed frame could
 * not — its opaque origin sends no cookies — which is why it fetches every image
 * and passes it in as a data URL, four at a time. That path is kept here only
 * as the fallback for an image whose direct load fails.
 *
 * Images whose attachment is not known yet stay sourceless until
 * `setAttachments` supplies it, so the list-row stand-in giving way to the real
 * conversation fills them in without remounting the body.
 */
export function activateEmailBody(
  root: ShadowRoot,
  lifetime: ResourceLifetime,
  { attachments, apiBaseUrl, visibleContentIds }: ActivateEmailBodyInput
): InlineImageActivation {
  const wanted = new Set(visibleContentIds);
  const shown = new Set<string>();
  let current = attachments;

  const showWanted = () => {
    if (lifetime.signal.aborted) return;
    const pending = [...wanted].filter((id) => !shown.has(id));
    const sources = getInlineEmailImageSources(current, apiBaseUrl, pending);
    for (const [contentId, url] of sources) {
      shown.add(contentId);
      showInlineImage(root, contentId, url, lifetime.signal);
    }
  };

  wireQuoteToggle(root, lifetime.signal, (quoted) => {
    for (const element of quoted.querySelectorAll<HTMLElement>('[data-inline-cid]')) {
      const contentId = element.getAttribute('data-inline-cid');
      if (contentId) wanted.add(contentId);
    }
    showWanted();
  });

  showWanted();

  return {
    setAttachments(next) {
      current = next;
      showWanted();
    },
  };
}

function showInlineImage(root: ShadowRoot, contentId: string, url: string, signal: AbortSignal) {
  // Compared rather than built into a selector: a content id is
  // sender-controlled and can hold quotes and backslashes.
  for (const image of root.querySelectorAll<HTMLImageElement>('img[data-inline-cid]')) {
    if (image.getAttribute('data-inline-cid') !== contentId || image.hasAttribute('src')) continue;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => image.removeAttribute('data-missing-inline-image'), {
      once: true,
      signal,
    });
    image.addEventListener('error', () => showInlineImageAsData(image, contentId, url, signal), {
      once: true,
      signal,
    });
    image.src = url;
  }
}

/** The frame's way in: fetch with credentials and inline the bytes as a data URL. */
function showInlineImageAsData(
  image: HTMLImageElement,
  contentId: string,
  url: string,
  signal: AbortSignal
) {
  // No broken-image icon while the fallback runs, or if it fails too.
  image.removeAttribute('src');
  loadInlineEmailImageData(
    new Map([[contentId, url]]),
    (_contentId, dataUrl) => {
      if (signal.aborted || !dataUrl.startsWith('data:image/')) return;
      image.src = dataUrl;
      image.removeAttribute('data-missing-inline-image');
    },
    signal
  ).catch((error: unknown) => console.warn('Failed to load an inline email image', error));
}

/** The shadow-root twin of the toggle handler in `email-html-document.ts`'s frame script. */
function wireQuoteToggle(
  root: ShadowRoot,
  signal: AbortSignal,
  onFirstOpen: (quoted: HTMLElement) => void
) {
  const toggle = root.querySelector<HTMLElement>(`[${QUOTE_TOGGLE_ATTRIBUTE}]`);
  const quoted = root.querySelector<HTMLElement>(`[${QUOTED_CONTENT_ATTRIBUTE}]`);
  if (!toggle || !quoted) return;

  let opened = false;
  toggle.addEventListener(
    'click',
    () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      const label = expanded ? 'Show trimmed content' : 'Hide trimmed content';
      animateQuote(quoted, !expanded);
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      if (!expanded && !opened) {
        opened = true;
        onFirstOpen(quoted);
      }
    },
    { signal }
  );
}

/**
 * Our reading-surface rules, carried over from the frame stylesheet in
 * `email-html-document.ts` — see the comments there for why each exists. Rules
 * for the frame's own `html`/`body` become `:host`. Prepended to the message,
 * so the sender's stylesheet still wins where it is as specific.
 *
 * Two kinds of colour, and they are treated differently on purpose:
 *
 * - **Text colours stay light-theme values** (`color`, link colour). They are
 *   part of the message as far as Macro's `processEmailColors` is concerned: it
 *   assumes text was written for a white page and inverts it for a dark theme.
 *   A theme token here would already be light in dark mode and get inverted a
 *   second time, into dark-on-dark.
 * - **Chrome colours use theme tokens** (the quote rule, the toggle). The
 *   adaptation never touches borders or backgrounds-as-images, so these follow
 *   the theme only if we make them. The toggle's fill is a `background-image`
 *   for the same reason: `processEmailColors` strips light `background-color`s
 *   so a personal message sits on the card, and it would strip ours too.
 *
 * `:host([data-elli-fixed-light])` is the white panel — a message with tables,
 * kept as designed — where chrome must stay light whatever the app theme.
 */
/* eslint-disable no-restricted-syntax -- a CSS stylesheet for the shadow root,
   not a Tailwind class string. `!important` overrides the sender's inline styles. */
export const EMAIL_SHADOW_BODY_CSS = `
:host {
  --email-rule: var(--border, #e4e4e7);
  --email-chip: var(--muted, #f4f4f5);
  --email-chip-ink: var(--muted-foreground, #71717a);
  --email-chip-hover: var(--accent, #e4e4e7);
  --email-chip-hover-ink: var(--foreground, #3f3f46);
  /* The mail reader's link token, so an adapted body follows the theme. */
  --email-link: var(--mail-link, ${EMAIL_LINK_COLOR});
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  /* The default a message is written against; adapted like any sender colour. */
  color: #18181b;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
:host([data-elli-fixed-light]) {
  --email-rule: #e4e4e7;
  --email-chip: #f4f4f5;
  --email-chip-ink: #71717a;
  --email-chip-hover: #e4e4e7;
  --email-chip-hover-ink: #3f3f46;
  /* On white whatever the app theme — dark mode's cyan would wash out here. */
  --email-link: ${EMAIL_LINK_COLOR};
}
p.MsoNormal, p.MsoPlainText, p.MsoNoSpacing, p.MsoListParagraph,
li.MsoNormal, li.MsoListParagraph, div.MsoNormal {
  margin: 0;
}
${EMAIL_LINK_CSS}
table { border-collapse: collapse; max-width: 100%; }
pre { overflow-x: auto; }
[style*="position: fixed"], [style*="position:fixed"],
[style*="position: absolute"], [style*="position:absolute"] { position: relative !important; }

[${QUOTE_TOGGLE_ATTRIBUTE}] {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  margin: 6px 0;
  padding: 0 7px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(var(--email-chip), var(--email-chip));
  color: var(--email-chip-ink);
  cursor: pointer;
  line-height: 0;
  transition: color 120ms ease;
}
[${QUOTE_TOGGLE_ATTRIBUTE}]:hover {
  background: linear-gradient(var(--email-chip-hover), var(--email-chip-hover));
  color: var(--email-chip-hover-ink);
}
[${QUOTE_TOGGLE_ATTRIBUTE}]:focus-visible { outline: 2px solid ${EMAIL_LINK_COLOR}; outline-offset: 2px; }
[data-elli-quote-dot] { width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
/* A date the reader can turn into an event (elli-ui#686): a dashed underline,
   as Zoho draws it, in the text's own colour so it never fights the message. */
[data-elli-date] {
  cursor: pointer;
  border-radius: 2px;
  text-decoration: underline dashed;
  text-decoration-color: color-mix(in srgb, currentColor 55%, transparent);
  text-underline-offset: 3px;
}
[data-elli-date]:hover { text-decoration-color: currentColor; background: var(--email-chip); }
[data-elli-date]:focus-visible { outline: 2px solid var(--email-link); outline-offset: 1px; }
@media (prefers-reduced-motion: reduce) {
  [${QUOTE_TOGGLE_ATTRIBUTE}] { transition: none; }
}

[${QUOTED_CONTENT_ATTRIBUTE}] {
  padding-left: 12px;
  border-left: 2px solid var(--email-rule);
  color: #52525b;
}
/* A sender's \`div { display: block }\` would otherwise override \`[hidden]\`. */
[${QUOTED_CONTENT_ATTRIBUTE}][hidden] { display: none !important; }
[${QUOTED_CONTENT_ATTRIBUTE}] blockquote {
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 0 !important;
  border-left: 0 !important;
}
[${QUOTED_CONTENT_ATTRIBUTE}] hr { display: none !important; }
`;
/* eslint-enable no-restricted-syntax */
