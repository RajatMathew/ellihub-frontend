import { describe, expect, test } from 'bun:test';

import { splitPinnedEmailFolders } from '../src/modules/email/lib/email-pinned-folders';

/**
 * elli-ui#1442 — Drafts, Deleted Items, Junk Email and Outbox sat in "Folders",
 * sorted among the project folders, while only Sent Items and Archive were
 * pinned under "Go to".
 */

const folder = (
  providerId: string,
  name: string,
  key: string | null = null,
  parentId?: string
) => ({
  providerId,
  name,
  key,
  parentId: parentId ?? 'mailbox-root',
});

const MAILBOX = [
  folder('p1', '31200 - JFK NTO KOREAN - EXT'),
  folder('x', 'Outbox'),
  folder('d', 'Drafts', 'drafts'),
  folder('i', 'Inbox', 'inbox'),
  folder('h', 'Conversation History'),
  folder('j', 'Junk Email', 'junk'),
  folder('s', 'Sent Items', 'sent'),
  folder('del', 'Deleted Items', 'deleted'),
  folder('a', 'Archive', 'archive'),
  folder('p2', 'P.S. 254K - N/A'),
];

describe('the folders pinned under "Go to"', () => {
  test('every system folder, in Outlook’s order', () => {
    const { pinned } = splitPinnedEmailFolders(MAILBOX);
    expect(pinned.map(({ folder: entry }) => entry.name)).toEqual([
      'Drafts',
      'Sent Items',
      'Deleted Items',
      'Archive',
      'Junk Email',
      'Outbox',
      'Conversation History',
    ]);
  });

  test('leaves only the project folders for "Folders", never the Inbox', () => {
    const { rest } = splitPinnedEmailFolders(MAILBOX);
    expect(rest.map((entry) => entry.name)).toEqual([
      '31200 - JFK NTO KOREAN - EXT',
      'P.S. 254K - N/A',
    ]);
  });

  test('a project’s own "Outbox" subfolder is not the system Outbox', () => {
    const { pinned, rest } = splitPinnedEmailFolders([
      folder('p1', '31200 - JFK'),
      folder('sub', 'Outbox', null, 'p1'),
    ]);
    expect(pinned).toEqual([]);
    expect(rest.map((entry) => entry.providerId)).toEqual(['p1', 'sub']);
  });

  test('a mailbox without a folder gets no row for it', () => {
    const { pinned } = splitPinnedEmailFolders([folder('s', 'Sent Items', 'sent')]);
    expect(pinned.map(({ kind }) => kind)).toEqual(['sent']);
  });
});
