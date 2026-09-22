import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * Deleting one email asks first, from wherever it is deleted.
 *
 * The mailbox has four ways to delete: the trash in the reading-pane toolbar,
 * the `d` shortcut, the bulk bar, and the trash that appears on a list row on
 * hover. The first three opened a confirmation; the fourth mutated straight
 * from the row, so a single click moved mail to Deleted Items and said so only
 * in a toast afterwards (elli-ui#1070).
 *
 * This is wiring rather than logic, and the unit suite has no renderer, so it
 * is pinned the way `email-row-quick-actions.test.ts` pins the row's padding —
 * by reading the source. The invariant is narrow and worth stating: the delete
 * mutation is fired in exactly one place, and that place is behind the dialog.
 */

function mailboxPageSource(): string {
  return readFileSync(
    path.join(import.meta.dir, '..', 'src', 'modules', 'email', 'pages', 'mailbox-page.tsx'),
    'utf8'
  );
}

describe('deleting one email is confirmed first', () => {
  test('the delete mutation is fired from exactly one place', () => {
    const source = mailboxPageSource();
    const calls = source.match(/deleteMessageMutation\.mutate\(/g) ?? [];

    // A second call site is a second path that can skip the dialog, which is
    // precisely how the row's trash came to bypass it.
    expect(calls.length).toBe(1);
  });

  test('that place is the dialog’s confirm handler', () => {
    const source = mailboxPageSource();
    const confirmDelete = source.slice(
      source.indexOf('const confirmDelete = useCallback('),
      source.indexOf('// Anchor for Outlook-style Shift range selection')
    );

    expect(confirmDelete).toContain('deleteMessageMutation.mutate(');
  });

  test('the row’s trash opens the dialog instead of deleting', () => {
    const source = mailboxPageSource();
    const handler = source.slice(
      source.indexOf('const handleDeleteEmail = useCallback('),
      source.indexOf('const handleToggleFlagEmail = useCallback(')
    );

    expect(handler).toContain('requestDelete(');
    expect(handler).not.toContain('deleteMessageMutation');
  });

  test('the row’s trash and the row’s archive go through the same shape', () => {
    const source = mailboxPageSource();
    const archive = source.slice(
      source.indexOf('const handleArchiveEmail = useCallback('),
      source.indexOf('const handleDeleteEmail = useCallback(')
    );

    // Archive already asked. Delete drifting away from it is the bug; keeping
    // the two written the same way is what stops it drifting back.
    expect(archive).toContain('requestArchive(email.latestMessageId ?? email.id)');
  });

  test('the confirmation names where the mail is going', () => {
    const source = mailboxPageSource();
    const dialog = source.slice(
      source.indexOf('const deleteDialog = ('),
      source.indexOf('const bulkDeleteDialog = (')
    );

    expect(dialog).toContain('Delete this email?');
    expect(dialog).toContain('The email will move to Deleted Items.');
    expect(dialog).toContain('variant="destructive"');
  });
});
