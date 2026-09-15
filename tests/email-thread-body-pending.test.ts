import { describe, expect, test } from 'bun:test';

import { isThreadBodyPending } from '../src/modules/email/lib/email-thread-body-pending';

/**
 * Whether the reading pane is showing a stand-in rather than a message (#942).
 *
 * The list row carries only `preview` — a flattened plain-text excerpt of the
 * whole thread, quoted chain included. Rendered as a body it is a wall of
 * unformatted text with `-----Original Message-----` rules in it, on screen for
 * the moment before the real HTML lands.
 */

const base = {
  hasSelection: true,
  hasConversation: false,
  hasMessageDetail: false,
  isConversationPending: false,
  isMessageDetailPending: false,
};

describe('is the thread body still coming', () => {
  test('yes while the conversation is in flight', () => {
    expect(isThreadBodyPending({ ...base, isConversationPending: true })).toBe(true);
  });

  test('yes while a single message is in flight', () => {
    expect(isThreadBodyPending({ ...base, isMessageDetailPending: true })).toBe(true);
  });

  test('no once the conversation has answered', () => {
    // Real bodies are on screen; a skeleton here would replace the message.
    expect(
      isThreadBodyPending({ ...base, hasConversation: true, isConversationPending: true })
    ).toBe(false);
  });

  test('no once the single message has answered', () => {
    expect(
      isThreadBodyPending({ ...base, hasMessageDetail: true, isMessageDetailPending: true })
    ).toBe(false);
  });

  test('no when nothing is selected', () => {
    // The pane is showing its empty state, not a body.
    expect(isThreadBodyPending({ ...base, hasSelection: false, isConversationPending: true })).toBe(
      false
    );
  });

  test('no when both queries have settled with nothing', () => {
    // Nothing better is coming, so show what there is rather than a skeleton
    // that never resolves.
    expect(isThreadBodyPending(base)).toBe(false);
  });
});
