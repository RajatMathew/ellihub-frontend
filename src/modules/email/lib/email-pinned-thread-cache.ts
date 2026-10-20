import type { ConnectedEmailListItem } from '@/modules/email/api';
import { emailKeys } from '@/modules/email/constants/email.keys';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * The pinned group's cache, kept in step with a message leaving its folder.
 *
 * The pinned group is its own query (`emailKeys.pinnedThreads`), merged into
 * the folder list on the page. Archive, move and delete took the row out of the
 * message pages and never touched this one, so the merge put the thread
 * straight back — and with a five minute `staleTime` and nothing invalidating
 * it, it stayed until the query happened to refetch.
 */
export type PinnedThreadSnapshots = Array<[QueryKey, ConnectedEmailListItem[] | undefined]>;

export interface MovedPinnedThread {
  messageId: string;
  /** Of the moved message, when a list held it. */
  conversationKey?: string | null;
  targetFolderId?: string | null;
}

export function getPinnedThreadSnapshots(
  queryClient: QueryClient,
  accountId: string
): PinnedThreadSnapshots {
  return queryClient.getQueriesData<ConnectedEmailListItem[]>({
    queryKey: emailKeys.pinnedThreadsRoot(accountId),
  });
}

// Keyed on the conversation as well as the message, the same way the page
// merges the two lists: a thread replied to since the pinned group was fetched
// sits there under an older message id, and is still the row being moved.
function isMovedThread(row: ConnectedEmailListItem, moved: MovedPinnedThread) {
  return (
    row.id === moved.messageId ||
    (Boolean(moved.conversationKey) && row.conversationKey === moved.conversationKey)
  );
}

/** The moved thread as a pinned group holds it — for a thread that has fallen off the loaded pages. */
export function findPinnedThread(
  snapshots: PinnedThreadSnapshots,
  moved: Pick<MovedPinnedThread, 'messageId' | 'conversationKey'>
): ConnectedEmailListItem | null {
  for (const [, pinned] of snapshots) {
    const match = pinned?.find((row) => isMovedThread(row, moved));
    if (match) return match;
  }
  return null;
}

/**
 * Takes a moved thread out of every pinned group it has left.
 *
 * Removal only. The destination folder's group is ordered by pin time on the
 * server, so it is refetched rather than rebuilt here — and the mailbox-wide
 * group (a `null` folder) still holds the thread wherever it went.
 */
export function removeThreadFromPinnedLists(
  queryClient: QueryClient,
  snapshots: PinnedThreadSnapshots,
  moved: MovedPinnedThread
) {
  for (const [queryKey] of snapshots) {
    const folderId = queryKey[3];
    if (folderId == null || folderId === moved.targetFolderId) continue;

    queryClient.setQueryData<ConnectedEmailListItem[]>(queryKey, (current) => {
      if (!current?.some((row) => isMovedThread(row, moved))) return current;
      return current.filter((row) => !isMovedThread(row, moved));
    });
  }
}

/**
 * Whether a move leaves the pinned groups out of date, and so whether settling
 * it is worth a request.
 *
 * Most mail that gets archived was never pinned, and refetching the group
 * after every one of those is a request that cannot change anything. A message
 * no list holds says nothing either way, so that one refetches.
 */
export function moveMakesPinnedThreadsStale(
  movedMessage: Pick<ConnectedEmailListItem, 'classification'> | null,
  isInPinnedList: boolean
): boolean {
  if (isInPinnedList || !movedMessage) return true;
  return Boolean(movedMessage.classification?.pinnedAt);
}
