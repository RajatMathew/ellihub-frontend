export  interface BulkArchiveAction {
  /** What the bulk bar's archive slot does in this folder. */
  kind: 'archive' | 'unarchive' | 'restore';
  label: string;
  variant: 'archive' | 'restore';
}

/**
 * The bulk bar's archive slot, per folder. The Archive folder used to get no
 * action at all — archiving mail that is already archived means nothing — so a
 * selection there could only be deleted (elli-ui#1148).
 */
export function resolveBulkArchiveAction(folder: {
  isArchiveFolder: boolean;
  isDeletedFolder: boolean;
  hasInboxFolder: boolean;
}): BulkArchiveAction | null {
  if (folder.isDeletedFolder) {
    // Restore moves to the Inbox by id, so it needs the Inbox to be known.
    return folder.hasInboxFolder ? { kind: 'restore', label: 'Restore', variant: 'restore' } : null;
  }
  if (folder.isArchiveFolder) {
    return { kind: 'unarchive', label: 'Unarchive', variant: 'restore' };
  }
  return { kind: 'archive', label: 'Archive', variant: 'archive' };
}
