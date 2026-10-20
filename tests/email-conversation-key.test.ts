import { describe, expect, test } from 'bun:test';

import { conversationScope, emailKeys } from '../src/modules/email/constants/email.keys';

/**
 * elli-ui#1264: two conversations Outlook files under one thread id must not
 * share a cache entry.
 *
 * The API keys a conversation as `{threadId}::{subject}` and answers each with
 * only its own messages. The client keyed the cache by thread alone, so the
 * second conversation opened read the first one's messages out of the cache.
 */

const THREAD = 'AAQkADAwATNiZmYAZS1i';
const QUOTE = `${THREAD}::window sills job quote`;
const RECEIPT = `${THREAD}::receipt m2649`;

describe('the conversation cache key', () => {
  test('differs for two conversations on the same thread', () => {
    expect(emailKeys.conversation('acct', THREAD, QUOTE)).not.toEqual(
      emailKeys.conversation('acct', THREAD, RECEIPT)
    );
  });

  test('is the same for the same conversation from every caller', () => {
    // The reading pane, mark-read and the draft snapshot all build it.
    expect(emailKeys.conversation('acct', THREAD, QUOTE)).toEqual(
      emailKeys.conversation('acct', THREAD, QUOTE)
    );
  });

  test('treats a conversation key equal to the thread id as none', () => {
    // Mark-read fills a missing key in with the thread id; the reading pane
    // sends none. Both must land on the one entry.
    expect(emailKeys.conversation('acct', THREAD, THREAD)).toEqual(
      emailKeys.conversation('acct', THREAD, null)
    );
    expect(emailKeys.conversation('acct', THREAD, undefined)).toEqual(
      emailKeys.conversation('acct', THREAD, null)
    );
  });

  test('stays under the account root, so account-wide invalidation still reaches it', () => {
    const key = emailKeys.conversation('acct', THREAD, QUOTE);
    const root = emailKeys.conversationRoot('acct');

    expect(key.slice(0, root.length)).toEqual([...root]);
  });
});

describe('what narrows a conversation request', () => {
  test('is the conversation key when it says more than the thread', () => {
    expect(conversationScope(THREAD, QUOTE)).toBe(QUOTE);
  });

  test('is nothing for a row that is the whole thread', () => {
    expect(conversationScope(THREAD, null)).toBeNull();
    expect(conversationScope(THREAD, '')).toBeNull();
    expect(conversationScope(THREAD, THREAD)).toBeNull();
  });
});
