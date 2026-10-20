import type { FilePreviewItem } from '@/modules/files/components/file-preview-dialog';

/**
 * What the preview dialog is currently meant to fetch, as a value that is equal
 * across renders when nothing has actually changed.
 *
 * The dialog loads a file through a caller-supplied `loadFile`, and that load
 * used to be keyed on the `file` **object**. `email-reading-pane.tsx` builds
 * that object inline in JSX, so it is a new reference on every render of the
 * reading pane — and `loadFile` there reports download progress through
 * `setPreviewProgress`, which renders the reading pane. Each progress tick
 * therefore handed the dialog a "new" file, the load effect re-ran, and running
 * it reported progress again: an unbounded cascade that React stopped with
 * "Maximum update depth exceeded" (minified error #185) the moment anyone
 * clicked an attachment (elli-ui#975).
 *
 * A file is identified by its id, never by which object happens to be holding
 * it, so that is what the load is keyed on. Returning `null` — closed, no file,
 * a folder, or no loader to call — is what stops the effect before it fetches
 * anything.
 */
export function filePreviewLoadKey({
  open,
  file,
  hasLoader,
}: {
  open: boolean;
  file: FilePreviewItem | null | undefined;
  hasLoader: boolean;
}): string | null {
  if (!open || !file || !hasLoader) return null;
  // Folders have nothing to fetch; the dialog renders them from metadata alone.
  if (file.type === 'FOLDER') return null;
  return file.id;
}
