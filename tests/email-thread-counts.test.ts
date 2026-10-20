import { describe, expect, test } from 'bun:test';

import { resolveThreadHeaderCounts } from '../src/modules/email/lib/email-thread-counts';

describe('resolveThreadHeaderCounts', () => {
  test('announces the conversation the row knows about, not the single stand-in on screen', () => {
    // elli-ui#1016: the pane rendered one fabricated message while the
    // conversation was in flight and the head said "1 message" for a
    // three-message thread, then contradicted itself when the real messages
    // landed. Without the fix this is 1.
    expect(
      resolveThreadHeaderCounts({
        renderedMessageCount: 1,
        renderedAttachmentCount: 0,
        rowMessageCount: 3,
        rowAttachmentCount: 2,
        isThreadPending: true,
      })
    ).toEqual({ messageCount: 3, attachmentCount: 2 });
  });

  test('counts what is rendered once the thread has arrived', () => {
    // A sent reply is in `messages` but not yet in the row's cached count.
    expect(
      resolveThreadHeaderCounts({
        renderedMessageCount: 4,
        renderedAttachmentCount: 1,
        rowMessageCount: 3,
        rowAttachmentCount: 1,
        isThreadPending: false,
      })
    ).toEqual({ messageCount: 4, attachmentCount: 1 });
  });

  test('never shrinks the head below what is already on screen', () => {
    expect(
      resolveThreadHeaderCounts({
        renderedMessageCount: 2,
        renderedAttachmentCount: 3,
        rowMessageCount: 1,
        rowAttachmentCount: 0,
        isThreadPending: true,
      })
    ).toEqual({ messageCount: 2, attachmentCount: 3 });
  });

  test('falls back to the rendered count when the row does not report one', () => {
    expect(
      resolveThreadHeaderCounts({
        renderedMessageCount: 1,
        renderedAttachmentCount: 0,
        rowMessageCount: undefined,
        rowAttachmentCount: null,
        isThreadPending: true,
      })
    ).toEqual({ messageCount: 1, attachmentCount: 0 });
  });

  test('ignores a row count that is not a usable number', () => {
    expect(
      resolveThreadHeaderCounts({
        renderedMessageCount: 1,
        renderedAttachmentCount: 0,
        rowMessageCount: Number.NaN,
        rowAttachmentCount: Number.POSITIVE_INFINITY,
        isThreadPending: true,
      })
    ).toEqual({ messageCount: 1, attachmentCount: 0 });
  });
});
