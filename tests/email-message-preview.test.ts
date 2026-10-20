import { describe, expect, test } from 'bun:test';

import { getMessagePreview } from '../src/modules/email/lib/email-message-preview';

/**
 * A collapsed message card summarises itself by stripping the tags out of its
 * own body. That stopped working when large conversations stopped sending
 * bodies: the 71-message "KA JFK" thread rendered as seventy-one cards all
 * reading "No message content". The server sends its own snippet in place of a
 * deferred body, and this is what picks it up.
 */
describe('getMessagePreview', () => {
  test('falls back to the server snippet when the body was deferred', () => {
    expect(getMessagePreview([], 'Price would be $1300.00. This includes union driver')).toBe(
      'Price would be $1300.00. This includes union driver'
    );
  });

  test('prefers the real body whenever there is one', () => {
    // A message that carries its body must not read from the snippet: the
    // snippet is an excerpt, and the body is the message.
    expect(getMessagePreview(['<p>Good morning,</p>'], 'stale snippet')).toBe('Good morning,');
  });

  test('falls back when the body is present but renders to nothing', () => {
    // A tracking pixel or a lone style block is markup with no text in it, and
    // stripping it leaves an empty string rather than a missing one.
    expect(getMessagePreview(['<style>.a{color:red}</style>'], 'Order acknowledgment')).toBe(
      'Order acknowledgment'
    );
  });

  test('still says so when there is neither a body nor a snippet', () => {
    expect(getMessagePreview([], undefined)).toBe('No message content');
    expect(getMessagePreview([], '   ')).toBe('No message content');
  });

  test('decodes entities and collapses whitespace, as it always did', () => {
    expect(getMessagePreview(['Tom &amp; Jerry  &nbsp; said &quot;hi&quot;'])).toBe(
      'Tom & Jerry said "hi"'
    );
  });
});

describe('a collapsed card whose message quotes the thread', () => {
  test('shows the reply, not the quoted original below it', () => {
    // Flattening the body puts the quote on the same line as the reply, so
    // this card read `QUOTE-ON test 1176: … From: Akash P <…> Sent: …` —
    // elli-ui#1176, seen in the thread view after the send test.
    expect(
      getMessagePreview([
        '<div>QUOTE-ON test 1176: this reply should carry the quoted original below it.</div>',
        '<div id="divRplyFwdMsg"><hr><div><b>From:</b> Akash P &lt;akashp2003@outlook.com&gt;</div><div><b>Sent:</b> Sep 3, 2026, 9:21 AM</div><div><b>To:</b> testt121121@outlook.com</div><div><b>Subject:</b> Re: it works now</div><div>nice</div></div>',
      ])
    ).toBe('QUOTE-ON test 1176: this reply should carry the quoted original below it.');
  });

  test('cleans the provider snippet too, not just the body', () => {
    // The fallback is what a large thread falls back to, and it is the same
    // flattened-with-quote string the mailbox row gets.
    expect(
      getMessagePreview(
        [],
        'Please see attached. From: Elli - Procurement <procurement@ellicorp.com> Sent: Tuesday, June 24, 2025 2:41 PM To: Ana <ana@ellicorp.com> Subject: RFQ'
      )
    ).toBe('Please see attached.');
  });

  test('a message that is only a quote still says something', () => {
    // Cutting to nothing would put "No message content" on a card that does
    // have content, which is the failure this file exists to catch.
    const forward =
      '<div>From: Fieldwire &lt;support@fieldwire.com&gt; Sent: Monday, May 18, 2026 12:24 PM To: Luz &lt;luz@ellicorp.com&gt; Subject: Photo Export</div>';

    expect(getMessagePreview([forward])).toContain('Fieldwire');
  });
});
