import { formatFileSize } from '@/modules/files/constants/files.constants';
import type { FileItem } from '@/modules/files/schemas/file.schema';

type SizedItem = Pick<FileItem, 'type' | 'size' | 'totalSize' | 'fileCount'>;

/**
 * The bytes a row stands for: a file its own size, a folder everything below
 * it. Null where the API sends no total — for a folder the viewer may not see
 * the contents of, or from an API that does not send totals yet.
 */
export function getFileItemBytes(item: SizedItem): number | null {
  return item.type === 'FOLDER' ? (item.totalSize ?? null) : (item.size ?? null);
}

/** What the Size column shows, with the file count as its tooltip for a folder. */
export function describeFileItemSize(item: SizedItem): { label: string; title?: string } {
  if (item.type !== 'FOLDER') return { label: formatFileSize(item.size) };
  if (item.totalSize == null || item.fileCount == null) return { label: '-' };
  if (item.fileCount === 0) return { label: 'Empty', title: 'No files' };

  return {
    label: formatFileSize(item.totalSize),
    title: `${item.fileCount.toLocaleString()} ${item.fileCount === 1 ? 'file' : 'files'}`,
  };
}
