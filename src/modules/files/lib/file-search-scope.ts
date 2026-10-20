import type { FilesSearchMode } from '@/modules/files/hooks/use-files-list-params';

/**
 * The folder a Files search is limited to — it and everything inside it — or
 * `undefined` for the whole drive.
 *
 * - "This folder" searches the open folder and all its subfolders. It used to
 *   search only the items directly inside, so a file one folder down was not
 *   found from its project.
 * - "All files" searches everything the explorer can reach: the whole drive
 *   on the Files page, the whole project on a project's Files tab.
 *
 * At the top of the drive the two mean the same thing, and the drive is sent as
 * no folder at all: limiting to the drive root would have the API list every
 * item's id first, only to keep them all.
 */
export function getFilesSearchAncestorId({
  searchMode,
  currentFolderId,
  explorerRootId,
  driveRootId,
}: {
  searchMode: FilesSearchMode;
  /** The folder open now. */
  currentFolderId: string | undefined;
  /** The explorer's own root, when it has one — a project's folder. */
  explorerRootId: string | undefined;
  /** The drive's root folder, when the explorer shows the drive. */
  driveRootId: string | undefined;
}): string | undefined {
  const folderId = searchMode === 'folder' ? currentFolderId : explorerRootId;

  if (!folderId || folderId === driveRootId) return undefined;
  return folderId;
}
