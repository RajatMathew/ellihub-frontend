import {
  EMAIL_THREAD_STATE_LABELS,
  emailThreadStateTone,
  EMPTY_EMAIL_REFERENCE_MARKER_STATE,
  isEmailThreadStateSet,
  resolveEmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import { describe, expect, test } from 'bun:test';

/**
 * A thread nobody has given a court to.
 *
 * The court had four values and no way to say "nobody has said yet", so
 * `open` did both jobs: the API reported it for every conversation with no
 * classification row, and the client drew it in the destructive red it uses
 * for a court somebody chose. The whole mailbox — every message back to the
 * first one ever synced — therefore read as open and overdue, and the pill
 * could not distinguish a thread waiting on an answer from one no human had
 * looked at.
 *
 * `unset` is that fifth value. These are the decisions that depend on it.
 */

describe('resolving a thread court', () => {
  test('a message with no court reported is unset, not open', () => {
    expect(resolveEmailThreadState(undefined)).toBe('unset');
    expect(resolveEmailThreadState(null)).toBe('unset');
  });

  test('a court somebody set is left alone', () => {
    expect(resolveEmailThreadState('open')).toBe('open');
    expect(resolveEmailThreadState('open_their_court')).toBe('open_their_court');
    expect(resolveEmailThreadState('closed')).toBe('closed');
  });

  test('the marker a thread starts from carries no court', () => {
    expect(EMPTY_EMAIL_REFERENCE_MARKER_STATE.status).toBe('unset');
  });
});

describe('how a court is drawn', () => {
  test('unset is its own tone — not the open red, not the closed green', () => {
    expect(emailThreadStateTone('unset')).toBe('unset');
    expect(emailThreadStateTone('open')).toBe('open');
    expect(emailThreadStateTone('open_our_court')).toBe('open');
    expect(emailThreadStateTone('open_their_court')).toBe('open');
    expect(emailThreadStateTone('closed')).toBe('closed');
  });

  test('only a court somebody set is printed on a list row', () => {
    // The row is read-only, so an unset court renders nothing at all rather
    // than a "Set court" prompt the reader cannot act on from there.
    expect(isEmailThreadStateSet('unset')).toBe(false);
    expect(isEmailThreadStateSet('open')).toBe(true);
    expect(isEmailThreadStateSet('closed')).toBe(true);
  });

  test('the unset pill reads as the action it offers', () => {
    expect(EMAIL_THREAD_STATE_LABELS.unset).toBe('Set court');
    // The states somebody can choose keep the words they had.
    expect(EMAIL_THREAD_STATE_LABELS.open).toBe('Open');
    expect(EMAIL_THREAD_STATE_LABELS.open_our_court).toBe('Our court');
    expect(EMAIL_THREAD_STATE_LABELS.closed).toBe('Closed');
  });
});
