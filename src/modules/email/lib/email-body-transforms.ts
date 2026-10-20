import { QUOTED_CONTENT_ATTRIBUTE } from '@/modules/email/lib/email-quoted-content';

/**
 * Body transforms shared by both message renderers — the sandboxed frame in
 * `email-message-body.tsx` and the shadow-root renderer in
 * `email-shadow-body.tsx`. Moved here from `email-message-body.tsx` unchanged.
 */

/**
 * Web links and bare email addresses. Outlook writes a forwarded header's
 * `From: Name <a@b.com>` as plain text, so without the address branch those
 * never became links and missed the link style (elli-ui#1296). A URL that
 * contains an `@` is still taken whole: matching runs left to right, and the
 * URL branch claims it before the address branch can.
 */
export const URL_PATTERN =
  /\b((?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/gi;
// export const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi; — web links only
const EMAIL_ADDRESS_PATTERN = /^[^\s@/:]+@[^\s@/:]+$/;
const TRAILING_URL_PUNCTUATION_PATTERN = /[),.;:!?]+$/;
/**
 * The light theme's `--mail-link`. A message is drawn on white in the frame and
 * in the shadow root's fixed-light panel, so this is the one value that reads
 * there; adapted shadow bodies take `--mail-link` for the active theme.
 */
export const EMAIL_LINK_COLOR = '#2563eb';
// export const EMAIL_LINK_COLOR = '#0e7490'; — the app's `--link` teal (#1296); links read as blue again.

/**
 * Option 1 from the #1296 link study: a softer underline set further down,
 * that firms up on hover. The underline follows `currentColor`, so it tracks
 * whatever colour the link ends up — ours, the sender's, or Macro's adapted one.
 * No font weight: a link inside `<b>` would lose its bold.
 *
 * Only an anchor that goes somewhere. Outlook wraps every signature in a
 * bookmark, `<a name="_MailAutoSig">Regards, …</a>`, which is not a link; styled
 * as one, "Regards," and the name under it came out blue and underlined.
 */
export const EMAIL_LINK_CSS = `
a[href] {
  color: var(--email-link, ${EMAIL_LINK_COLOR});
  text-decoration-line: underline;
  text-decoration-thickness: 1.5px;
  text-decoration-color: color-mix(in srgb, currentColor 45%, transparent);
  text-underline-offset: 4px;
}
a[href]:hover { text-decoration-color: currentColor; }`;

export function splitTrailingUrlPunctuation(value: string) {
  const trailing = value.match(TRAILING_URL_PUNCTUATION_PATTERN)?.[0] ?? '';
  if (!trailing) return { url: value, trailing: '' };
  return {
    url: value.slice(0, -trailing.length),
    trailing,
  };
}

export function getLinkHref(url: string) {
  if (EMAIL_ADDRESS_PATTERN.test(url)) return `mailto:${url}`;
  return url.startsWith('www.') ? `https://${url}` : url;
}

/**
 * Content ids of images outside the collapsed quote.
 *
 * A long thread repeats the sender's signature logo in every quoted round, and
 * all of it is hidden behind the toggle — fetching those images on open pulled
 * megabytes the reader never sees. One real thread pulled sixteen attachments
 * this way. Images inside the quote load when it is expanded.
 */
export function collectVisibleContentIds(document: Document): string[] {
  const ids = new Set<string>();

  for (const element of document.body.querySelectorAll<HTMLElement>('[data-inline-cid]')) {
    if (element.closest(`[${QUOTED_CONTENT_ATTRIBUTE}]`)) continue;
    const cid = element.getAttribute('data-inline-cid');
    if (cid) ids.add(cid);
  }

  return [...ids];
}

export function linkifyTextNodes(document: Document) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || !URL_PATTERN.test(node.textContent)) {
        URL_PATTERN.lastIndex = 0;
        return NodeFilter.FILTER_REJECT;
      }
      URL_PATTERN.lastIndex = 0;

      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('a, style, script, code, pre')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const textNode of textNodes) {
    const fragment = document.createDocumentFragment();
    const value = textNode.textContent ?? '';
    let lastIndex = 0;

    for (const match of value.matchAll(URL_PATTERN)) {
      const matchedValue = match[0];
      const matchIndex = match.index ?? 0;
      const { url, trailing } = splitTrailingUrlPunctuation(matchedValue);

      if (matchIndex > lastIndex) {
        fragment.append(document.createTextNode(value.slice(lastIndex, matchIndex)));
      }
      if (url) {
        const link = document.createElement('a');
        link.href = getLinkHref(url);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = url;
        // Colour and underline come from EMAIL_LINK_CSS in both renderers; an
        // inline `text-decoration` would reset the softened underline colour.
        fragment.append(link);
      }
      if (trailing) fragment.append(document.createTextNode(trailing));
      lastIndex = matchIndex + matchedValue.length;
    }

    if (lastIndex < value.length) {
      fragment.append(document.createTextNode(value.slice(lastIndex)));
    }
    textNode.replaceWith(fragment);
  }
}
