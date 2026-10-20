/**
 * The mailbox's own system folders, pinned under "Go to" in the folder menu
 * (elli-ui#1442).
 *
 * Only Inbox, Sent Items and Archive used to be pinned. Drafts, Deleted Items,
 * Junk Email and Outbox were left in "Folders", sorted by name among the
 * project folders, so reaching Drafts meant scrolling past every "31200 - JFK
 * NTO KOREAN" above it. They are folders of the mailbox, not of the work, and
 * sit together at the top the way Outlook lists them.
 */

export type PinnedEmailFolderKind =
  | 'drafts'
  | 'sent'
  | 'deleted'
  | 'archive'
  | 'junk'
  | 'outbox'
  | 'history';

interface PinnedRule {
  kind: PinnedEmailFolderKind;
  /** The server's well-known key, where it has one. */
  key?: string;
  /**
   * The provider's name, for system folders the server gives no key — Outbox
   * and Conversation History. Matched only at the top of the mailbox, so a
   * project's own "Outbox" subfolder is never mistaken for the system one.
   */
  rootName?: string;
}

/** Outlook's order. Inbox leads the section on its own and is not listed here. */
const PINNED_RULES: readonly PinnedRule[] = [
  { kind: 'drafts', key: 'drafts' },
  { kind: 'sent', key: 'sent' },
  { kind: 'deleted', key: 'deleted' },
  { kind: 'archive', key: 'archive' },
  { kind: 'junk', key: 'junk' },
  { kind: 'outbox', rootName: 'outbox' },
  { kind: 'history', rootName: 'conversation history' },
];

export interface PinnableEmailFolder {
  providerId: string;
  name: string;
  key?: string | null;
  parentId?: string | null;
}

/**
 * The pinned system folders in Outlook's order — only those the mailbox has —
 * and every other folder except the Inbox, for the "Folders" tree.
 */
export function splitPinnedEmailFolders<T extends PinnableEmailFolder>(
  folders: readonly T[]
): { pinned: { folder: T; kind: PinnedEmailFolderKind }[]; rest: T[] } {
  const known = new Set(folders.map((folder) => folder.providerId));
  // The same rule the folder tree uses for a root: no parent in the list.
  const isRoot = (folder: T) => !folder.parentId || !known.has(folder.parentId);

  const taken = new Set<T>();
  const pinned: { folder: T; kind: PinnedEmailFolderKind }[] = [];
  for (const rule of PINNED_RULES) {
    const folder = folders.find(
      (candidate) =>
        !taken.has(candidate) &&
        (rule.key
          ? candidate.key === rule.key
          : isRoot(candidate) && candidate.name.trim().toLowerCase() === rule.rootName)
    );
    if (!folder) continue;
    taken.add(folder);
    pinned.push({ folder, kind: rule.kind });
  }

  const rest = folders.filter((folder) => !taken.has(folder) && folder.key !== 'inbox');
  return { pinned, rest };
}
