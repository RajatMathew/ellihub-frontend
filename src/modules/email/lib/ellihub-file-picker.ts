import type { FileItem } from '@/modules/files/schemas/file.schema';

/**
 * The rules behind "Select from ElliHub files" in the composer: what a folder
 * shows, and how a picked file becomes an attachment. Pure, so they are tested
 * without the dialog.
 */

export type PickerItem = Pick<
  FileItem,
  'id' | 'type' | 'name' | 'displayName' | 'mimeType' | 'size' | 'capabilities'
>;

export function pickerItemName(item: Pick<FileItem, 'displayName' | 'name'>): string {
  return item.displayName || item.name || 'Untitled';
}

/**
 * One folder's contents, folders first, each group by name, narrowed by the
 * filter. A file the reader may not download is left out — it could be listed,
 * but never attached.
 */
export function pickerEntries<T extends PickerItem>(
  children: readonly T[] | undefined,
  filter = ''
): { folders: T[]; files: T[] } {
  const needle = filter.trim().toLowerCase();
  const byName = (a: T, b: T) => pickerItemName(a).localeCompare(pickerItemName(b));
  const shown = (children ?? []).filter(
    (child) => !needle || pickerItemName(child).toLowerCase().includes(needle)
  );
  return {
    folders: shown.filter((child) => child.type === 'FOLDER').sort(byName),
    files: shown
      .filter((child) => child.type !== 'FOLDER' && child.capabilities?.download !== false)
      .sort(byName),
  };
}

/** A picked file as the composer takes one: named as Files shows it, typed as stored. */
export function toAttachmentFile(item: PickerItem, blob: Blob): File {
  return new File([blob], pickerItemName(item), {
    type: item.mimeType || blob.type || 'application/octet-stream',
  });
}

/**
 * Files as the `FileList` the composer's picker hands over, so a file from
 * ElliHub goes through the same size and duplicate checks as one from disk.
 */
export function toFileList(files: readonly File[]): FileList {
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  return transfer.files;
}
