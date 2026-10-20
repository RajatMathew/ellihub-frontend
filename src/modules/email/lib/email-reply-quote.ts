/**
 * The quoted original a reply carries below what you type.
 *
 * Until now nobody built one. The composer showed no quote, and what went out
 * depended on which provider the mailbox sits behind: Aurinko sends the body
 * verbatim, so replies from a personal mailbox left with no history at all,
 * while Microsoft's `/reply` action composes a quote itself, so replies from a
 * shared mailbox carried one nobody could see beforehand or turn off.
 *
 * elli-ui#1176 makes it the client's: the quote is built here, shown in the
 * composer, and sent only when the reader leaves the switch on. The server is
 * told so with `quoteHandledByClient`, which stops Graph adding a second.
 *
 * Relative imports on purpose: exercised by bun tests, and bun does not resolve
 * the `@/` alias.
 */

// The module's own escaper, rather than a second one: it already handles the
// bare-ampersand case (`&` that does not open a valid entity).

import { formatEmailDate } from './email-date';
import { escapeText, sanitizeEmailHtml } from './email-html-sanitize';

/** Marks the block so the composer can find, collapse and strip it. */
export const REPLY_QUOTE_ATTRIBUTE = 'data-elli-reply-quote';

/**
 * The id Outlook puts on its own quoted-original block, and the one every
 * quote-collapsing implementation keys off — ours included
 * (`QUOTE_BOUNDARY_SELECTORS` in `email-quoted-content.ts`).
 *
 * Our `data-` attribute does not survive the trip: the provider strips unknown
 * attributes, so a reply we sent came back with nothing on it but an `<hr>` and
 * four header rows. This id does survive, and it is what makes the quote
 * collapsible in the recipient's client as well as in ours. Outlook prefixes it
 * `x_` per nesting level when it quotes us back; the selector matches by
 * substring for exactly that reason.
 */
export const REPLY_QUOTE_BOUNDARY_ID = 'divRplyFwdMsg';

export type ReplyQuoteSource = {
  senderName?: string | null;
  senderEmail?: string | null;
  /**
   * ISO from the API. Formatted here rather than taken as-is: the thread card
   * holds the raw value, and a quote header reading
   * `Sent: 2026-09-03T03:51:18.000Z` is not what any mail client shows.
   */
  sentAt?: string | null;
  to?: Array<{ name?: string | null; address?: string | null }> | null;
  cc?: Array<{ name?: string | null; address?: string | null }> | null;
  subject?: string | null;
  /** Body parts as the thread card holds them, newest fragment first. */
  body?: string[] | null;
};

/** `Rajat Mathew <rajat@ellicorp.com>`, or whichever half exists. */
export function formatQuoteAddress(person: {
  name?: string | null;
  address?: string | null;
}): string {
  const name = person.name?.trim() ?? '';
  const address = person.address?.trim() ?? '';
  if (name && address && name.toLowerCase() !== address.toLowerCase()) {
    return `${name} <${address}>`;
  }
  return address || name;
}

function formatAddressList(
  people: Array<{ name?: string | null; address?: string | null }> | null | undefined
): string {
  return (people ?? [])
    .map(formatQuoteAddress)
    .filter((value) => value.length > 0)
    .join('; ');
}

/**
 * The header block above a quoted original, in Outlook's order and labels.
 *
 * Rows with nothing in them are dropped rather than rendered empty — a reply to
 * a message with no Cc should not carry a blank `Cc:` line for ever afterwards,
 * because every later reply quotes this one.
 */
function buildQuoteHeader(source: ReplyQuoteSource): string {
  const from = formatQuoteAddress({
    name: source.senderName,
    address: source.senderEmail,
  });

  const rows: Array<[string, string]> = [
    ['From', from],
    ['Sent', source.sentAt?.trim() ? formatEmailDate(source.sentAt.trim()) : ''],
    ['To', formatAddressList(source.to)],
    ['Cc', formatAddressList(source.cc)],
    ['Subject', source.subject?.trim() ?? ''],
  ];

  return rows
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `<div><b>${label}:</b> ${escapeText(value)}</div>`)
    .join('');
}

/**
 * Builds the quoted block for a reply to `source`, or `''` when there is
 * nothing worth quoting.
 *
 * **The original body goes through the compose allowlist first.** It arrives
 * here raw — `message.body` is the provider's own HTML, straight off the API
 * and never sanitized on the way into the cache. The reading pane gets away
 * with that because it sanitizes a *copy* at render time and shows it inside a
 * sandboxed iframe (`email-html-document.ts`), which keeps `<style>`
 * deliberately. The composer has neither protection: it drops this string into
 * the application's own document with `dangerouslySetInnerHTML`.
 *
 * So the two things the iframe was absorbing both landed on the app instead.
 * A `<style>` block written for a full page — which most commercial mail ships
 * — applied to *our* DOM, and rules like
 * `body, p, div, td { font-family: Georgia, serif !important }` restyled the
 * whole client the moment a reply was opened (elli-ui#1216). And an
 * `<img src=x onerror=…>` in any message in the inbox ran with full session
 * access as soon as someone hit Reply.
 *
 * `sanitizeEmailHtml` is the same allowlist that guards pasted clipboard HTML
 * and everything else the composer sends. It drops `style`, `link`, `base` and
 * `script` with their contents, strips event handlers, and reduces inline
 * styles to allowlisted properties — which stay scoped to their own element
 * and so cannot leak. Structure a quote actually needs (tables, lists, images,
 * `font`) is kept.
 *
 * Sanitizing here rather than at the point of render is deliberate: this one
 * string is both what the composer shows and what
 * `buildReplyBodyForSend` puts on the wire, so the reader sees exactly the
 * quote that goes out.
 *
 * The header labels around it are escaped, because those are built from
 * address and subject strings.
 */
export function buildReplyQuote(source: ReplyQuoteSource): string {
  const header = buildQuoteHeader(source);
  const body = sanitizeEmailHtml((source.body ?? []).filter((part) => part?.trim()).join(''));

  // A quote with neither a header nor a body is an empty box with a rule above
  // it. Nothing to show, and nothing to send.
  if (!header && !body) return '';

  return [
    `<div id="${REPLY_QUOTE_BOUNDARY_ID}" ${REPLY_QUOTE_ATTRIBUTE}="true">`,
    '<hr>',
    header,
    body ? `<div>${body}</div>` : '',
    '</div>',
  ].join('');
}

/**
 * The body to send: what was typed, plus the quote when the reader left it on.
 *
 * Kept separate from the composer so the decision is testable — the suite has
 * no renderer, and "did the quote actually go out" is the part that matters.
 */
export function buildReplyBodyForSend(input: {
  /** Rich-text HTML from the editor. */
  typed: string;
  quote: string;
  includeQuote: boolean;
}): string {
  if (!input.includeQuote || !input.quote) return input.typed;
  return `${input.typed}${input.quote}`;
}
