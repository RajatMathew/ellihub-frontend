import { describe, expect, test } from 'bun:test';

import { MAX_SUGGESTED, SUGGESTION_KEYS, toSuggestedActions } from '../src/mock/agent-suggestions';

describe('what Elliot suggests for one attached email', () => {
  test('a server key becomes the matching rail action', () => {
    const [action] = toSuggestedActions({
      suggestions: [{ key: 'create_po', reason: 'Agreed price in thread' }],
    });
    expect(action?.label).toBe('Create PO');
    expect(action?.template).toContain('{email}');
    expect(action?.reason).toBe('Agreed price in thread');
    expect(action?.source).toBe('model');
  });

  test('a rule-found action is marked as such, so the chip shows no model icon', () => {
    const [action] = toSuggestedActions(
      { suggestions: [{ key: 'log_invoice', reason: 'INV-4411.pdf attached' }] },
      'rule'
    );
    expect(action?.source).toBe('rule');
  });

  test('a key the app does not have is dropped, as are repeats', () => {
    const actions = toSuggestedActions({
      suggestions: [
        { key: 'book_flight', reason: 'x' },
        { key: 'log_invoice', reason: 'Invoice attached' },
        { key: 'log_invoice', reason: 'Again' },
      ],
    });
    expect(actions.map((item) => item.key)).toEqual(['log_invoice']);
  });

  test('the list is capped and garbage is empty', () => {
    expect(
      toSuggestedActions({ suggestions: SUGGESTION_KEYS.map((key) => ({ key, reason: key })) })
    ).toHaveLength(MAX_SUGGESTED);
    expect(toSuggestedActions(undefined)).toEqual([]);
    expect(toSuggestedActions({ suggestions: 'nope' })).toEqual([]);
    expect(toSuggestedActions({ suggestions: [{ reason: 'no key' }] })).toEqual([]);
  });
});
