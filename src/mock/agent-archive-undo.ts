/**
 * What taking back one of Elliot's archives does (elli-ui#651). Elliot
 * archives at once, with no approval step, and the undo toast is the way back.
 */

export type ArchiveUndoStep =
  | { messageId: string; kind: 'unarchive' }
  | { messageId: string; kind: 'move'; folderId: string };

/**
 * Each message goes back where it was before the archive. Unarchive is the
 * provider's own way back and always lands in the Inbox, so it covers mail
 * that came from there, and mail whose folder was never known: none of the
 * loaded pages held it. Anything filed elsewhere is moved back to that folder,
 * or an undo would leave it in the Inbox, somewhere it had never been.
 */
export function archiveUndoSteps(
  messageIds: readonly string[],
  sourceFolderIds: ReadonlyMap<string, string | null>,
  folders: { inboxId?: string | null; archiveId?: string | null }
): ArchiveUndoStep[] {
  return messageIds.map((messageId) => {
    const source = sourceFolderIds.get(messageId) ?? null;
    if (!source || source === folders.inboxId || source === folders.archiveId) {
      return { messageId, kind: 'unarchive' };
    }
    return { messageId, kind: 'move', folderId: source };
  });
}

/**
 * The toast's words. It names the email when there is one, so the person can
 * tell which archive they are taking back.
 */
export function archiveToastCopy(count: number, subject?: string | null) {
  if (count > 1) {
    return {
      title: `${count} emails archived`,
      description: null,
      reversed: `${count} emails moved back.`,
    };
  }
  const name = subject?.trim();
  return {
    title: 'Email archived',
    description: name || null,
    reversed: 'Email moved back.',
  };
}
