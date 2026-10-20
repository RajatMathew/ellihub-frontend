import { describe, expect, test } from 'bun:test';

import {
  EMAIL_CATCH_UP_AFTER_HIDDEN_MS,
  shouldCatchUpOnOpen,
  shouldCatchUpOnVisible,
} from '../src/modules/email/lib/email-catch-up';

/**
 * A mailbox left open overnight went almost a day stale on staging, and only a
 * manual reload fixed it.
 *
 * Nothing on the client polls: every email query has `refetchOnMount`,
 * `refetchOnWindowFocus` and `refetchOnReconnect` set to false, so the socket
 * is the only thing that refreshes an open mailbox. When the socket missed a
 * window — a sleeping laptop, a throttled reconnect timer in a background tab
 * — the cache kept serving what it last heard, with nothing to correct it.
 *
 * Both gates below returned nothing at all before this change: `onopen` only
 * reset the backoff counter, and there was no visibility handler anywhere in
 * the module.
 */

describe('catching up when the socket reopens', () => {
  test('does not refetch on the first connect', () => {
    // The page's own queries are already in flight; a catch-up here is a
    // duplicate of requests that have not come back yet.
    expect(shouldCatchUpOnOpen(1)).toBe(false);
  });

  test('refetches on a reconnect, because nothing replays what was missed', () => {
    expect(shouldCatchUpOnOpen(2)).toBe(true);
  });

  test('keeps refetching on every later reconnect', () => {
    expect(shouldCatchUpOnOpen(3)).toBe(true);
    expect(shouldCatchUpOnOpen(97)).toBe(true);
  });
});

describe('catching up when the tab comes back', () => {
  test('a quick alt-tab costs nothing', () => {
    // Otherwise every window switch refetches the whole mailbox.
    expect(shouldCatchUpOnVisible(0)).toBe(false);
    expect(shouldCatchUpOnVisible(1_000)).toBe(false);
    expect(shouldCatchUpOnVisible(EMAIL_CATCH_UP_AFTER_HIDDEN_MS - 1)).toBe(false);
  });

  test('refetches once the tab has been hidden past the stale window', () => {
    expect(shouldCatchUpOnVisible(EMAIL_CATCH_UP_AFTER_HIDDEN_MS)).toBe(true);
  });

  test('refetches after the overnight case that caused this', () => {
    const aDay = 24 * 60 * 60 * 1000;
    expect(shouldCatchUpOnVisible(aDay)).toBe(true);
  });

  test('the window is caller-overridable, and compares against the given one', () => {
    expect(shouldCatchUpOnVisible(5_000, 10_000)).toBe(false);
    expect(shouldCatchUpOnVisible(10_000, 10_000)).toBe(true);
  });

  test('matches the messages staleTime, so it cannot drift from the cache it protects', () => {
    // `EMAIL_MESSAGES_STALE_TIME_MS` in email.hooks.ts. Inside that window the
    // cache is considered good, so refetching would be work a mount would not
    // have done either.
    expect(EMAIL_CATCH_UP_AFTER_HIDDEN_MS).toBe(60 * 1000);
  });
});
