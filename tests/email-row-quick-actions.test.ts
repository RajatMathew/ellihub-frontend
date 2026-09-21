import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  EMAIL_ROW_QUICK_ACTION_RESERVE,
  emailRowQuickActionReserve,
} from '../src/modules/email/lib/email-row-quick-actions';

/**
 * The quick-action cluster is absolutely positioned over the row, so nothing
 * reflows around it — the text under it has to give up the width itself. The
 * subject did and the preview line did not, so on hover the preview ran on
 * underneath three icons that have no fill of their own (elli-ui#995).
 */

function rowCardSource(): string {
  return readFileSync(
    path.join(import.meta.dir, '..', 'src', 'modules', 'email', 'components', 'email-row-card.tsx'),
    'utf8'
  );
}

describe('emailRowQuickActionReserve', () => {
  test('reserves nothing for a row that renders no quick actions', () => {
    expect(emailRowQuickActionReserve(false)).toBe(false);
  });

  test('reserves the cluster width when the row renders them', () => {
    expect(emailRowQuickActionReserve(true)).toBe(EMAIL_ROW_QUICK_ACTION_RESERVE);
  });

  test('reserves unconditionally below lg, where the actions never hide', () => {
    // Under `lg` the cluster is painted at `opacity-100` permanently — there is
    // no hover on a touch device to reveal it — so a hover-only reservation
    // left the text running under it at every moment. This is the case the
    // screen recording on #995 was showing.
    expect(EMAIL_ROW_QUICK_ACTION_RESERVE).toContain('max-lg:pe-24');
  });

  test('reserves on hover and on focus at lg and up', () => {
    expect(EMAIL_ROW_QUICK_ACTION_RESERVE).toContain('lg:group-hover:pe-24');
    // Keyboard users reveal the cluster with focus, not hover.
    expect(EMAIL_ROW_QUICK_ACTION_RESERVE).toContain('lg:group-focus-within:pe-24');
  });

  test('never reserves unconditionally at lg, which would be dead space at rest', () => {
    // A bare `pe-24` with no variant would indent every resting row.
    expect(EMAIL_ROW_QUICK_ACTION_RESERVE.split(' ')).not.toContain('pe-24');
  });

  test('uses one media query per breakpoint, so neither has to override the other', () => {
    // `max-lg:` and `lg:` are mutually exclusive, which is what keeps the
    // result independent of the order Tailwind emits the two variants in.
    expect(EMAIL_ROW_QUICK_ACTION_RESERVE).not.toContain('lg:pe-0');
  });
});

describe('the row applies the reservation to every line the cluster covers', () => {
  test('both the subject and the preview yield the width', () => {
    const source = rowCardSource();
    const applications = source.match(/emailRowQuickActionReserve\(hasQuickActions\)/g) ?? [];

    // One for the subject, one for the preview underneath it. The cluster is
    // two lines tall and sits over both.
    expect(applications.length).toBe(2);
  });

  test('no line hand-rolls the padding instead of going through the helper', () => {
    const source = rowCardSource();

    // The subject and preview drifting apart is exactly how #995 happened.
    expect(source).not.toContain('lg:group-hover:pe-24');
  });
});

describe('the cluster sits on an opaque surface', () => {
  test('the quick actions carry a card background', () => {
    const source = rowCardSource();
    const cluster = source.slice(source.indexOf('absolute right-2.5 top-8'));

    // The reservation is one fixed width and the cluster grows with the number
    // of actions on the row, so the text under it is not guaranteed to end
    // before the icons start. Without a fill of its own the overflow showed
    // straight through the glyphs.
    expect(cluster).toContain('bg-mail-card');
  });
});
