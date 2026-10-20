import type { FileItem } from '@/modules/files/schemas/file.schema';

/**
 * The two groups a Files listing is split into, on one rule: whether the item
 * can be deleted.
 *
 * - `system` — what Elli creates and keeps: the root and entity folders, a
 *   project's folder tree, files pinned in a prime contract folder. The API
 *   sends these with `isDeletable: false`; they cannot be deleted or renamed.
 * - `user` — everything people upload or create themselves.
 *
 * Not to be confused with elli-core's protected folder areas
 * (`protectedFolderType`), which decide who may open a folder, not which group
 * it is listed in.
 */
export type FileSection = 'system' | 'user';

export const FILE_SECTION_LABELS: Record<FileSection, string> = {
  system: 'System Files',
  user: 'User Files',
};

export interface SectionedFiles {
  systemItems: FileItem[];
  userItems: FileItem[];
  /** Both groups in display order, system first. */
  data: FileItem[];
}

export function getFileSection(item: Pick<FileItem, 'isDeletable'>): FileSection {
  return item.isDeletable ? 'user' : 'system';
}

export function sectionFileItems(items: FileItem[]): SectionedFiles {
  const systemItems = items.filter((item) => getFileSection(item) === 'system');
  const userItems = items.filter((item) => getFileSection(item) === 'user');

  return { systemItems, userItems, data: [...systemItems, ...userItems] };
}
