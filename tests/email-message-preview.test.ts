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
