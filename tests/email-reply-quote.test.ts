import { describe, expect, test } from 'bun:test';

import {
  buildReplyBodyForSend,
  buildReplyQuote,
  formatQuoteAddress,
  REPLY_QUOTE_ATTRIBUTE,
  REPLY_QUOTE_BOUNDARY_ID,
} from '../src/modules/email/lib/email-reply-quote';

/**
 * The quoted original a reply carries, and whether it actually goes out.
 *
 * Before elli-ui#1176 the composer showed no quote and the answer to "does the
 * history get sent" depended on the provider behind the mailbox — Aurinko sent
 * the body verbatim, Microsoft's `/reply` composed a quote of its own. The
 * reader could neither see it nor decide. These pin the part that decides.
 */

const original = {
  senderName: 'Rajat Mathew',
  senderEmail: 'rajatmathew10@outlook.com',
  sentAt: '2026-09-03T17:08:00.000Z',
  to: [{ name: 'Test In', address: 'testt121121@outlook.com' }],
  subject: 'Re: Test Subject',
  body: ['<p>All good man, how are you?</p>'],
};

describe('an address in a quote header', () => {
  test('reads as name and angle-bracketed address', () => {
    expect(formatQuoteAddress({ name: 'Rajat Mathew', address: 'rajat@ellicorp.com' })).toBe(
      'Rajat Mathew <rajat@ellicorp.com>'
    );
  });

  test('is just the address when there is no name', () => {
    expect(formatQuoteAddress({ name: '', address: 'ops@ellicorp.com' })).toBe('ops@ellicorp.com');
  });

  test('does not repeat itself when the name is the address', () => {
    // Outlook sends `name` equal to the address on plenty of messages, and
    // `a@b.com <a@b.com>` in a quote header is noise.
    expect(formatQuoteAddress({ name: 'A@B.com', address: 'a@b.com' })).toBe('a@b.com');
  });
});

describe('building the quote', () => {
  test('carries the Outlook header block above the original', () => {
    const quote = buildReplyQuote(original);

    expect(quote).toContain('<b>From:</b> Rajat Mathew &lt;rajatmathew10@outlook.com&gt;');
    // Formatted, not the raw ISO the card holds — a quote header reading
    // `Sent: 2026-09-03T17:08:00.000Z` is not what any mail client shows.
    expect(quote).toContain('<b>Sent:</b> Sep 3, 2026');
    expect(quote).toContain('<b>To:</b> Test In &lt;testt121121@outlook.com&gt;');
    expect(quote).toContain('<b>Subject:</b> Re: Test Subject');
    expect(quote).toContain('All good man, how are you?');
  });

  test('is marked, so the composer can collapse and strip it', () => {
    expect(buildReplyQuote(original)).toContain(REPLY_QUOTE_ATTRIBUTE);
  });

  test('carries the id a mail client collapses on, because the attribute does not survive', () => {
    // The `data-` mark is for this composer only: the provider strips unknown
    // attributes, and a reply we sent came back with nothing on the block but
    // an `<hr>` and four header rows. `divRplyFwdMsg` is what Outlook puts on
    // its own quoted original, so it survives and it is what both our reader
    // and the recipient's client key off.
    expect(buildReplyQuote(original)).toContain(`id="${REPLY_QUOTE_BOUNDARY_ID}"`);
  });

  test('drops rows that have nothing in them', () => {
    // Every later reply quotes this one, so a blank `Cc:` line would be
    // inherited down the whole thread.
    expect(buildReplyQuote(original)).not.toContain('<b>Cc:</b>');
  });

  test('includes Cc when there is one', () => {
    const quote = buildReplyQuote({
      ...original,
      cc: [{ name: 'Ops', address: 'ops@ellicorp.com' }],
    });

    expect(quote).toContain('<b>Cc:</b> Ops &lt;ops@ellicorp.com&gt;');
  });

  test('joins several recipients the way a mail client does', () => {
    const quote = buildReplyQuote({
      ...original,
      to: [
        { name: 'Test In', address: 'testt121121@outlook.com' },
        { name: null, address: 'ops@ellicorp.com' },
      ],
    });

    expect(quote).toContain('<b>To:</b> Test In &lt;testt121121@outlook.com&gt;; ops@ellicorp.com');
  });

  test('escapes the header values but not the quoted body', () => {
    // The body arrives already sanitized on its way into the thread card;
    // escaping it again would quote a wall of markup instead of the message.
    const quote = buildReplyQuote({
      ...original,
      subject: 'Re: <script>alert(1)</script>',
      body: ['<p>Real <b>markup</b> survives</p>'],
    });

    expect(quote).toContain('&lt;script&gt;');
    expect(quote).not.toContain('<script>');
    expect(quote).toContain('<p>Real <b>markup</b> survives</p>');
  });

  test('is empty when there is nothing to quote', () => {
    // An empty block would render as a horizontal rule over nothing.
    expect(buildReplyQuote({})).toBe('');
    expect(buildReplyQuote({ body: ['   '] })).toBe('');
  });
});

describe('what actually gets sent', () => {
  const quote = buildReplyQuote(original);
  const typed = '<p>Sounds good.</p>';

  test('the switch on appends the quote below what was typed', () => {
    const sent = buildReplyBodyForSend({ typed, quote, includeQuote: true });

    expect(sent.startsWith(typed)).toBe(true);
    expect(sent).toContain('All good man, how are you?');
  });

  test('the switch off sends only what was typed', () => {
    // The point of the whole feature: off has to mean the history does not
    // leave the building, not merely that it is hidden on screen.
    const sent = buildReplyBodyForSend({ typed, quote, includeQuote: false });

    expect(sent).toBe(typed);
    expect(sent).not.toContain('All good man');
  });

  test('a message with nothing to quote is unaffected either way', () => {
    for (const includeQuote of [true, false]) {
      expect(buildReplyBodyForSend({ typed, quote: '', includeQuote })).toBe(typed);
    }
  });
});

/**
 * elli-ui#1216: the quote is injected into the application's own document with
 * `dangerouslySetInnerHTML`, so everything the reading pane's sandboxed iframe
 * absorbs lands on the app instead. The body arrives raw — nothing sanitizes
 * `message.body` on its way into the cache — so it has to be sanitized here.
 */
describe('buildReplyQuote keeps the original message out of the app', () => {
  const quoteWithBody = (body: string) =>
    buildReplyQuote({
      senderName: 'Shalini Sangiliyandi',
      senderEmail: 'shalini@ellicorp.com',
      subject: 'Re: Turkish Office- Shop Drawings RFQ',
      body: [body],
    });

  test('drops a stylesheet that would restyle the whole client', () => {
    // The reported symptom: commercial mail ships page-wide CSS, and
    // `!important` on `body`/`div`/`td` beat every utility class in the app —
    // opening a reply turned the entire UI serif.
    const quote = quoteWithBody(
      '<style>body, p, div, td { font-family: Georgia, serif !important; }</style><p>Hi</p>'
    );

    expect(quote).not.toContain('<style');
    expect(quote).not.toContain('Georgia');
    expect(quote).toContain('Hi');
  });

  test('drops a linked stylesheet too', () => {
    const quote = quoteWithBody(
      '<link rel="stylesheet" href="https://example.com/mail.css"><p>Hi</p>'
    );

    expect(quote).not.toContain('<link');
    expect(quote).toContain('Hi');
  });

  test('drops an event handler that would run with the session', () => {
    // Worse than the font: any message in the inbox could run script in our
    // origin the moment the reader pressed Reply.
    const quote = quoteWithBody('<img src="x" onerror="alert(1)"><p>Hi</p>');

    expect(quote).not.toContain('onerror');
    expect(quote).not.toContain('alert(1)');
  });

  test('drops a script block with its source', () => {
    const quote = quoteWithBody('<script>fetch("/api/v1/users/me")</script><p>Hi</p>');

    expect(quote).not.toContain('<script');
    expect(quote).not.toContain('fetch(');
    expect(quote).toContain('Hi');
  });

  test('keeps an inline style, which is scoped to its own element', () => {
    // Inline style cannot leak, and stripping it would flatten every quote.
    const quote = quoteWithBody('<p style="color: #ff0000">Hi</p>');

    expect(quote).toContain('color: #ff0000');
  });

  test('keeps the structure a quote is actually made of', () => {
    const quote = quoteWithBody(
      '<table><tbody><tr><td><b>Order</b></td><td>#WH45978223</td></tr></tbody></table>' +
        '<ul><li>One</li></ul><a href="https://example.com">Link</a>'
    );

    expect(quote).toContain('<table>');
    expect(quote).toContain('<td>');
    expect(quote).toContain('<li>');
    expect(quote).toContain('href="https://example.com"');
  });

  test('the sanitized quote is what gets sent, not just what is shown', () => {
    // One string feeds the composer and the wire, so the reader cannot be
    // shown a clean quote while a stylesheet goes out inside the reply.
    const quote = quoteWithBody('<style>div { font-family: Georgia; }</style><p>Hi</p>');
    const sent = buildReplyBodyForSend({ typed: '<div>Thanks</div>', quote, includeQuote: true });

    expect(sent).not.toContain('<style');
    expect(sent).toContain('Thanks');
    expect(sent).toContain('Hi');
  });

  test('a body that is nothing but a stylesheet leaves no empty quote behind', () => {
    // Sanitizing can empty the body out; with no header either there is
    // nothing to show but a rule and a switch.
    expect(buildReplyQuote({ body: ['<style>div { color: red; }</style>'] })).toBe('');
  });
});
