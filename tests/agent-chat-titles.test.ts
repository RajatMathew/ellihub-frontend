import { describe, expect, test } from 'bun:test';

import {
  chatHeaderTitle,
  MAX_CHAT_TITLE_CHARS,
  renamedTitle,
  withConversationTitle,
} from '../src/mock/agent-chat-titles';

/**
 * elli-ui#1370: the header named every chat "Elliot", and a chat's new name
 * only showed after the list was fetched again.
 */
const chat = (id: string, title: string) => ({
  id,
  title,
  summary: null,
  updatedAt: '2026-10-12T10:00:00.000Z',
});

describe("the header's name for the open chat", () => {
  test('is the chat name, never "Elliot"', () => {
    expect(
      chatHeaderTitle({
        conversationId: 'c1',
        liveTitles: {},
        history: [chat('c1', 'Steel quote')],
      })
    ).toBe('Steel quote');
  });

  test('prefers the name this session just learned over the list', () => {
    expect(
      chatHeaderTitle({
        conversationId: 'c1',
        liveTitles: { c1: 'Reply to ACME on lead time' },
        history: [chat('c1', 'Re: Steel quote')],
      })
    ).toBe('Reply to ACME on lead time');
  });

  test('is "New chat" before there is a chat, or before it has a name', () => {
    expect(chatHeaderTitle({ conversationId: null, liveTitles: { c1: 'x' }, history: [] })).toBe(
      'New chat'
    );
    expect(chatHeaderTitle({ conversationId: 'c9', liveTitles: {}, history: [] })).toBe('New chat');
  });
});

describe('the chats list after a chat is named', () => {
  test('renames the chat in place', () => {
    const list = withConversationTitle([chat('c1', 'Old'), chat('c2', 'Other')], {
      id: 'c2',
      title: 'New',
    });
    expect(list.map((item) => item.title)).toEqual(['Old', 'New']);
  });

  test('puts a chat it did not have yet at the top', () => {
    const list = withConversationTitle([chat('c1', 'Old')], { id: 'c2', title: 'Fresh' });
    expect(list.map((item) => item.id)).toEqual(['c2', 'c1']);
  });
});

describe('a rename', () => {
  test('saves the trimmed name, and nothing when it is empty or unchanged', () => {
    expect(renamedTitle('  Steel   quote ', 'Old')).toBe('Steel quote');
    expect(renamedTitle('   ', 'Old')).toBeNull();
    expect(renamedTitle('Old', 'Old')).toBeNull();
    expect(renamedTitle('x'.repeat(100), 'Old')).toHaveLength(MAX_CHAT_TITLE_CHARS);
  });
});
