import { describe, expect, test } from 'bun:test';

import {
  latestThreadMessage,
  orderThreadNewestFirst,
} from '../src/modules/email/lib/email-thread-order';

type Message = { id: string; sentAt: string };

const thread: Message[] = [
  { id: 'first', sentAt: '2026-09-16T09:15:00.000Z' },
  { id: 'second', sentAt: '2026-09-17T21:15:00.000Z' },
  { id: 'third', sentAt: '2026-09-19T13:01:00.000Z' },
];

describe('orderThreadNewestFirst', () => {
  test('draws the newest message first', () => {
    expect(orderThreadNewestFirst(thread).map((message) => message.id)).toEqual([
      'third',
      'second',
      'first',
    ]);
  });

  test('puts a just-sent reply at the top, where the composer is', () => {
    // The pane appends an optimistic reply to the chronological array; the
    // reader has to see it without scrolling, which is the whole of #1025.
    const sending: Message = { id: 'optimistic', sentAt: 'Sending...' };
    expect(orderThreadNewestFirst([...thread, sending])[0]?.id).toBe('optimistic');
  });

  test('does not mutate the chronological array it is given', () => {
    const input = [...thread];
    orderThreadNewestFirst(input);
    expect(input.map((message) => message.id)).toEqual(['first', 'second', 'third']);
  });

  test('handles an empty thread and a single message', () => {
    expect(orderThreadNewestFirst([])).toEqual([]);
    expect(orderThreadNewestFirst([thread[0]!]).map((message) => message.id)).toEqual(['first']);
  });
});

describe('latestThreadMessage', () => {
  test('is the newest message, not the last one drawn', () => {
    // Reading order is reversed, so the last rendered card is the oldest
    // message. Anything that followed render position — the reply target, the
    // action row — would have pointed at 'first'.
    const latest = latestThreadMessage(thread);
    expect(latest?.id).toBe('third');
    expect(orderThreadNewestFirst(thread).at(-1)?.id).toBe('first');
  });

  test('is null for an empty thread', () => {
    expect(latestThreadMessage([])).toBeNull();
  });
});
