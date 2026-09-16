import { describe, expect, test } from 'bun:test';

import { emailAiSuggestionSchema } from '../src/modules/email/api/email-ai-suggestion.api';
import { suggestionFixture } from '../src/modules/email/data/ai-suggestion.fixture';

/**
 * The stand-in AI endpoint (elli-ui#921).
 *
 * These pin the two things the panel actually depends on while the real
 * endpoint does not exist: that a thread's suggestion never changes under it,
 * and that whatever comes back parses as the schema the real endpoint will be
 * held to. When the fake is swapped for the real call, the schema assertion
 * below is the one that keeps the contract honest.
 */
describe('suggestionFixture', () => {
  test('gives the same thread the same suggestion every time', () => {
    const first = suggestionFixture('AAQkAGI2thread-1');
    const second = suggestionFixture('AAQkAGI2thread-1');
    expect(second).toEqual(first);
  });

  test('does not give every thread the same suggestion', () => {
    const shapes = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((key) =>
        JSON.stringify(suggestionFixture(key)?.classification ?? null)
      )
    );
    expect(shapes.size).toBeGreaterThan(1);
  });

  test('returns nothing for a thread with no conversation key', () => {
    // The reading pane renders before a conversation resolves, and an empty
    // key must not be treated as a real thread with a real suggestion.
    expect(suggestionFixture('')).toBeNull();
  });

  test('every suggestion it can return parses as the endpoint contract', () => {
    for (let index = 0; index < 40; index += 1) {
      const suggestion = suggestionFixture(`thread-${index}`);
      expect(() => emailAiSuggestionSchema.nullable().parse(suggestion)).not.toThrow();
    }
  });

  test('carries the conversation key it was asked about', () => {
    // The panel matches the suggestion to the open thread by this field; a
    // fixture that hard-coded its own key would attach to the wrong thread.
    const suggestion = suggestionFixture('thread-with-a-suggestion');
    if (suggestion) expect(suggestion.conversationKey).toBe('thread-with-a-suggestion');
  });
});
