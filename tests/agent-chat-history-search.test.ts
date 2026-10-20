import { describe, expect, test } from 'bun:test';

import { searchConversations } from '../src/mock/agent-fullscreen-rules';

/** elli-ui#1414: searching earlier chats from the title menu. */
const chats = [
  { id: '1', title: 'Log Parksite invoices', summary: 'Three invoices for PO 26703' },
  { id: '2', title: 'Kanban board ideas', summary: null },
  { id: '3', title: 'RFQ follow-up', summary: 'Atlantic Plywood hinges' },
];

describe('searching chats', () => {
  test('matches every word in the title or summary, ignoring case', () => {
    expect(searchConversations(chats, 'parksite 26703').map((c) => c.id)).toEqual(['1']);
    expect(searchConversations(chats, 'PLYWOOD').map((c) => c.id)).toEqual(['3']);
  });

  test('a chat without a summary is still found by title', () => {
    expect(searchConversations(chats, 'kanban').map((c) => c.id)).toEqual(['2']);
  });

  test('a blank query keeps every chat', () => {
    expect(searchConversations(chats, '   ')).toHaveLength(3);
  });

  test('nothing matches a word no chat has', () => {
    expect(searchConversations(chats, 'invoices kanban')).toEqual([]);
  });
});
