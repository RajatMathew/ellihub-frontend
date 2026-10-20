import { describe, expect, test } from 'bun:test';

import {
  buildEmailFolderTree,
  emailFolderIndentClass,
  type EmailTreeFolder,
} from '../src/modules/email/lib/email-folder-tree';

const folder = (providerId: string, name: string, parentId?: string | null): EmailTreeFolder => ({
  id: `cache-${providerId}`,
  providerId,
  name,
  parentId: parentId ?? null,
});

const shape = (folders: EmailTreeFolder[]) =>
  buildEmailFolderTree(folders).map((entry) => `${'  '.repeat(entry.depth)}${entry.folder.name}`);

describe('buildEmailFolderTree', () => {
  test('puts each folder directly under its parent', () => {
    expect(
      shape([
        folder('projects', 'Projects'),
        folder('inbox', 'Inbox'),
        folder('acme', 'Acme', 'y2026'),
        folder('y2026', '2026', 'projects'),
        folder('y2025', '2025', 'projects'),
      ])
    ).toEqual(['Inbox', 'Projects', '  2025', '  2026', '    Acme']);
  });

  test('links on the provider id, not the cache id', () => {
    // `parentId` is the provider's own `parentFolderId`. Matching it against
    // the row's `id` finds nothing and flattens the tree back out, which is the
    // whole reason nested folders needed a helper rather than a sort.
    const tree = buildEmailFolderTree([folder('root', 'Root'), folder('child', 'Child', 'root')]);

    expect(tree.map((entry) => entry.depth)).toEqual([0, 1]);
  });

  test('treats a folder whose parent is not listed as a root', () => {
    // Graph reports a top-level folder's parent as the mailbox's hidden root,
    // which is never itself listed. That is the normal case, not an error.
    expect(shape([folder('inbox', 'Inbox', 'msgfolderroot')])).toEqual(['Inbox']);
  });

  test('keeps every folder even when a level is missing', () => {
    // One child-folder request failing server-side leaves a gap in the middle.
    // The orphans still have to be reachable — this menu is the only way in.
    expect(shape([folder('inbox', 'Inbox'), folder('orphan', 'Orphan', 'never-loaded')])).toEqual([
      'Inbox',
      'Orphan',
    ]);
  });

  test('sorts siblings by name, case-insensitively', () => {
    expect(shape([folder('b', 'bids'), folder('a', 'Archive'), folder('c', 'Contracts')])).toEqual([
      'Archive',
      'bids',
      'Contracts',
    ]);
  });

  test('renders every folder exactly once when the data has a cycle', () => {
    const tree = buildEmailFolderTree([
      folder('a', 'A', 'b'),
      folder('b', 'B', 'a'),
      folder('inbox', 'Inbox'),
    ]);

    expect(tree.map((entry) => entry.folder.name).sort()).toEqual(['A', 'B', 'Inbox']);
    expect(tree).toHaveLength(3);
  });

  test('survives a folder that claims to be its own parent', () => {
    expect(shape([folder('self', 'Self', 'self')])).toEqual(['Self']);
  });

  test('answers an empty mailbox with an empty list', () => {
    expect(buildEmailFolderTree([])).toEqual([]);
  });
});

describe('emailFolderIndentClass', () => {
  test('indents by depth', () => {
    expect(emailFolderIndentClass(0)).toBe('');
    expect(emailFolderIndentClass(1)).toBe('ps-6');
    expect(emailFolderIndentClass(2)).toBe('ps-9');
  });

  test('stops growing rather than pushing a deep name off the menu', () => {
    expect(emailFolderIndentClass(3)).toBe('ps-12');
    expect(emailFolderIndentClass(9)).toBe('ps-12');
    expect(emailFolderIndentClass(-1)).toBe('');
  });
});
