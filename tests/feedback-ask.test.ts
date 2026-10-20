import { describe, expect, test } from 'bun:test';

import {
  clampFeedbackTitle,
  FEEDBACK_TITLE_MAX_LENGTH,
  shouldAskForFeedback,
} from '../src/modules/feedback/lib/feedback-ask';

/**
 * elli-ui#1050: the ask follows a change to the details panel, while the
 * reason for it is still in the person's head. The rule below is the whole
 * reason it stays bearable — an ask after every edit is a dialog between
 * someone and the work they came to do.
 */
describe('when to ask why a change was made', () => {
  test('asks on the first edit of a session', () => {
    expect(shouldAskForFeedback({ askedThisSession: false, edits: 1 })).toBe(true);
  });

  test('never asks twice in a session, however many edits follow', () => {
    // The regression this guards: dismissing the dialog and then touching the
    // panel again brings it straight back, which is how an ask becomes a
    // thing people learn to click away without reading.
    expect(shouldAskForFeedback({ askedThisSession: true, edits: 2 })).toBe(false);
    expect(shouldAskForFeedback({ askedThisSession: true, edits: 50 })).toBe(false);
  });

  test('does not ask before anything has been edited', () => {
    // Opening a thread is not a change, and asking why someone read an email
    // has no answer.
    expect(shouldAskForFeedback({ askedThisSession: false, edits: 0 })).toBe(false);
  });

  test('a caller can let the first few edits pass', () => {
    const later = { askedThisSession: false, askAfterEdits: 3 };
    expect(shouldAskForFeedback({ ...later, edits: 2 })).toBe(false);
    expect(shouldAskForFeedback({ ...later, edits: 3 })).toBe(true);
    expect(shouldAskForFeedback({ ...later, edits: 4 })).toBe(true);
  });

  test('a threshold below one never asks, rather than asking always', () => {
    // `askAfterEdits: 0` reads as "ask immediately", which would mean asking
    // on a mount with no edit at all. Refusing is the safer reading of a
    // value nobody should be passing.
    expect(shouldAskForFeedback({ askedThisSession: false, edits: 0, askAfterEdits: 0 })).toBe(
      false
    );
    expect(shouldAskForFeedback({ askedThisSession: false, edits: 9, askAfterEdits: -1 })).toBe(
      false
    );
  });
});

describe('the title the ask files under', () => {
  const long = `Additional details changed on “${'a'.repeat(200)}”`;

  test('a short title is left exactly as it is', () => {
    expect(clampFeedbackTitle('Additional details changed on “Quote request”')).toBe(
      'Additional details changed on “Quote request”'
    );
  });

  test('a long one is cut to what the API accepts', () => {
    // The regression: mail subjects are unbounded, so the first real attempt
    // to give feedback on a thread with a long subject was rejected with
    // "Title must be 120 characters or fewer" and the feedback was lost.
    const clamped = clampFeedbackTitle(long);
    expect(clamped.length).toBeLessThanOrEqual(FEEDBACK_TITLE_MAX_LENGTH);
    expect(clamped.endsWith('…')).toBe(true);
  });

  test('a title exactly at the limit is not cut', () => {
    const exact = 'x'.repeat(FEEDBACK_TITLE_MAX_LENGTH);
    expect(clampFeedbackTitle(exact)).toBe(exact);
  });

  test('surrounding space never counts toward the limit', () => {
    expect(clampFeedbackTitle('   Changed the court   ')).toBe('Changed the court');
  });
});
