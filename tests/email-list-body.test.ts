import { describe, expect, test } from 'bun:test';

import { listRowIsWholeThread } from '../src/modules/email/lib/email-list-body';

const row = (over: Record<string, unknown> = {}) => ({
  threadMessageCount: 1,
  attachmentCount: 0,
  body: ['<p>The whole message.</p>'],
  ...over,
});

describe('deciding whether a list row is the whole mail', () => {
  test('a one-message thread carrying its body needs no request', () => {
    expect(listRowIsWholeThread(row())).toBe(true);
  });

  test('a thread still needs fetching', () => {
    expect(listRowIsWholeThread(row({ threadMessageCount: 4 }))).toBe(false);
  });

  test('a mail with a file still needs fetching', () => {
    // The row carries an attachmentCount but not the attachments themselves,
    // so the chips would be missing.
    expect(listRowIsWholeThread(row({ attachmentCount: 1 }))).toBe(false);
  });

  test('a mail flagged as having a file still needs fetching before its count is known', () => {
    // A shared-mailbox row raises the flag from the sync and learns the count
    // only once elli-core lists the files; the chips are still not on the row.
    expect(listRowIsWholeThread(row({ hasAttachments: true }))).toBe(false);
  });

  test('a row whose body did not fit the page budget still needs fetching', () => {
    expect(listRowIsWholeThread(row({ body: undefined }))).toBe(false);
    expect(listRowIsWholeThread(row({ body: [] }))).toBe(false);
    expect(listRowIsWholeThread(row({ body: [''] }))).toBe(false);
    expect(listRowIsWholeThread(row({ body: ['   '] }))).toBe(false);
  });

  test('a row from a server that sends no counts is not assumed complete', () => {
    expect(listRowIsWholeThread({ body: ['<p>hi</p>'] })).toBe(true);
    expect(listRowIsWholeThread({})).toBe(false);
  });

  test('no row at all', () => {
    expect(listRowIsWholeThread(null)).toBe(false);
    expect(listRowIsWholeThread(undefined)).toBe(false);
  });
});
