import type { FileItem } from '@/modules/files/schemas/file.schema';

/** Capabilities come from the API; a missing flag means "not restricted". */
export function canUploadTo(folder: Pick<FileItem, 'capabilities'> | undefined): boolean {
  return folder?.capabilities?.upload !== false;
}

function displayNameOf(item: Pick<FileItem, 'displayName' | 'name'>): string {
  return item.displayName || item.name || '';
}

export interface FolderContents<T> {
  /** Sub-folders you can save into. */
  folders: T[];
  /** Sub-folders you can browse but not save into. */
  restrictedFolders: T[];
  /** What is already filed here. Shown, never selectable. */
  files: T[];
}

/**
 * What the folder picker shows for one folder (elli-ui#1066).
 *
 * The picker used to keep only the sub-folders and throw the rest away, so a
 * folder holding forty files and no sub-folders announced itself as "No
 * subfolders in Temp." — which tells you nothing about whether you are about
 * to save a second copy of something into it. The files are already in the
 * same response, so listing them costs nothing.
 *
 * One filter box sits above one list, so it narrows all three buckets.
 */
export function splitFolderContents<
  T extends Pick<FileItem, 'type' | 'displayName' | 'name' | 'capabilities'>,
>(children: readonly T[] | undefined, filter = ''): FolderContents<T> {
  const needle = filter.trim().toLowerCase();
  const matches = needle
    ? (children ?? []).filter((child) => displayNameOf(child).toLowerCase().includes(needle))
    : (children ?? []);

  const folders = matches.filter((child) => child.type === 'FOLDER');

  return {
    folders: folders.filter(canUploadTo),
    restrictedFolders: folders.filter((folder) => !canUploadTo(folder)),
    files: matches.filter((child) => child.type !== 'FOLDER'),
  };
}
