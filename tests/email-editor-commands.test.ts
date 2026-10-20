import { toLinkHref } from '@/modules/email/lib/email-editor-commands';
import { describe, expect, test } from 'bun:test';

describe('toLinkHref', () => {
  test('adds a scheme to what people actually type', () => {
    // Without one, createLink writes a relative href that resolves against the
    // app's own origin, and the recipient gets a link back into our mailbox.
    expect(toLinkHref('elli.com')).toBe('https://elli.com');
    expect(toLinkHref('www.elli.com/quotes')).toBe('https://www.elli.com/quotes');
  });

  test('leaves a URL that already has one alone', () => {
    expect(toLinkHref('https://elli.com')).toBe('https://elli.com');
    expect(toLinkHref('http://elli.com')).toBe('http://elli.com');
    expect(toLinkHref('mailto:site@elli.com')).toBe('mailto:site@elli.com');
  });

  test('refuses a script URL before the link is ever created', () => {
    // The sanitizer would strip this on the way out; refusing here means it is
    // never written into the draft in the first place.
    expect(toLinkHref('javascript:alert(1)')).toBeNull();
    expect(toLinkHref('JaVaScRiPt:alert(1)')).toBeNull();
  });

  test('refuses blank input rather than linking nothing', () => {
    expect(toLinkHref('')).toBeNull();
    expect(toLinkHref('   ')).toBeNull();
  });

  test('trims what was typed', () => {
    expect(toLinkHref('  elli.com  ')).toBe('https://elli.com');
  });

  test('gives a protocol-relative URL a scheme rather than refusing it', () => {
    // The sanitizer rejects `//host`, so passing one through would create a
    // link that is stripped back out on the way to the provider.
    expect(toLinkHref('//elli.com/x')).toBe('https://elli.com/x');
  });
});
