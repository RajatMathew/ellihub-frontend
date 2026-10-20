import { describe, expect, test } from 'bun:test';

import type { EmailThreadReference } from '../src/modules/email/api/email.api';
import { emailSaveScopes } from '../src/modules/email/lib/email-save-scopes';
import { labelForShownRoot } from '../src/modules/files/save-to-files/save-scopes';

/**
 * The project chips in the Save to Files dialog (elli-ui#1067).
 *
 * A thread linked to three projects opened the picker inside the first one
 * only. The dialog now offers each linked project, from the same references
 * the Additional details panel lists.
 */

const reference = (overrides: Partial<EmailThreadReference>) =>
  ({
    type: 'project',
    entityType: 'project',
    entityId: 'project-1',
    label: 'Brooklyn Public Library',
    ...overrides,
  }) as EmailThreadReference;

describe('the projects a thread can be saved under', () => {
  test('are every linked project, in the order they were linked', () => {
    const scopes = emailSaveScopes([
      reference({ entityId: 'p-bpl', label: 'Brooklyn Public Library' }),
      reference({ entityId: 'p-105', label: 'PS 105X' }),
      reference({ entityId: 'p-133', label: 'PS 133X' }),
    ]);

    expect(scopes).toEqual([
      { id: 'p-bpl', label: 'Brooklyn Public Library' },
      { id: 'p-105', label: 'PS 105X' },
      { id: 'p-133', label: 'PS 133X' },
    ]);
  });

  test('leave out invoices, POs and the other non-project links', () => {
    const scopes = emailSaveScopes([
      reference({ entityId: 'p-bpl' }),
      reference({ type: 'purchaseOrder', entityType: 'purchaseOrder', entityId: 'po-1' }),
      reference({ type: 'other', entityType: null, entityId: null, label: 'Other' }),
    ]);

    expect(scopes.map((scope) => scope.id)).toEqual(['p-bpl']);
  });

  test('leave out a typed-in project label, which has no folder to open', () => {
    expect(emailSaveScopes([reference({ entityId: null, label: 'Somewhere' })])).toEqual([]);
  });

  test('offer a project linked twice only once', () => {
    const scopes = emailSaveScopes([
      reference({ entityId: 'p-bpl' }),
      reference({ entityId: 'p-bpl' }),
    ]);

    expect(scopes).toHaveLength(1);
  });

  test('are none for an unfiled thread', () => {
    expect(emailSaveScopes(undefined)).toEqual([]);
    expect(emailSaveScopes([])).toEqual([]);
  });
});

describe('the name over the folders on screen', () => {
  const scopes = [
    { id: 'p-bpl', label: 'Brooklyn Public Library' },
    { id: 'p-105', label: 'PS 105X' },
  ];
  const folders: Record<string, string> = { 'p-bpl': 'folder-bpl', 'p-105': 'folder-105' };
  const folderIdOf = (id: string) => folders[id];

  test('is the project whose folder is showing', () => {
    expect(labelForShownRoot(scopes, 'folder-105', folderIdOf, 'Project Files')).toBe('PS 105X');
  });

  test('stays on the previous project while the picked one is still loading', () => {
    // PS 105X was clicked, but its folder has not come back yet, so the picker
    // is still showing Brooklyn's — and must say so.
    const loading = (id: string) => (id === 'p-105' ? undefined : folders[id]);

    expect(labelForShownRoot(scopes, 'folder-bpl', loading, 'Project Files')).toBe(
      'Brooklyn Public Library'
    );
  });

  test("falls back to the caller's label for a folder no project owns", () => {
    expect(labelForShownRoot(scopes, 'folder-elsewhere', folderIdOf, 'Project Files')).toBe(
      'Project Files'
    );
    expect(labelForShownRoot(scopes, undefined, folderIdOf, 'Project Files')).toBe('Project Files');
  });
});
