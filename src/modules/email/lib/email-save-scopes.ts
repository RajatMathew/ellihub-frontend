import type { EmailThreadReference } from '@/modules/email/api/email.api';
import type { SaveToFilesScope } from '@/modules/files/save-to-files';

/**
 * The projects a thread's attachments can be saved under: every project linked
 * in its Additional details, in the order they were linked (elli-ui#1067).
 *
 * The same list the details panel shows, so the chips in the save dialog match
 * what the reader already sees on the thread. Only references to a real
 * project count — a typed-in label has no folder to open — and a project linked
 * twice is offered once. The first one is the folder the dialog opens in.
 */
export function emailSaveScopes(
  references: readonly EmailThreadReference[] | null | undefined
): SaveToFilesScope[] {
  const seen = new Set<string>();
  const scopes: SaveToFilesScope[] = [];

  for (const reference of references ?? []) {
    if (reference.type !== 'project' || !reference.entityId) continue;
    if (seen.has(reference.entityId)) continue;

    seen.add(reference.entityId);
    scopes.push({ id: reference.entityId, label: reference.label });
  }

  return scopes;
}
