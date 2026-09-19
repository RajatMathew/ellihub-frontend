/**
 * Attachment helpers shared by every compose surface (the modal and the inline
 * reading-pane composer). They live outside the components so both shells and
 * the `useEmailCompose` controller work from one copy of the rules.
 */

import { isAxiosError } from 'axios';

export const ATTACHMENT_PREPARATION_FALLBACK = 'The attachment could not be prepared. Try again.';

/**
 * Providers cap the WHOLE message, not each file — Outlook silently drops mail
 * whose combined attachments exceed ~25 MB, so the budget must be enforced
 * across every attached file together, mirroring the check in elli-core.
 */
export const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Takes the base64 payload off a `data:` URL without splitting the string.
 *
 * `readAsDataURL` hands back one string of 4/3 × the file size — 33 MB at the
 * message cap — and `split(',')` walks all of it and allocates an array of
 * whole copies to reach a prefix that is always the first ~50 characters.
 * `indexOf`/`slice` stops at the separator: measured on a 25 MB file, 46 ms
 * and a full 33 MB copy become under 1 ms and a shared slice.
 */
export function stripDataUrlPrefix(dataUrl: string): string {
  const separator = dataUrl.indexOf(',');
  return separator === -1 ? dataUrl : dataUrl.slice(separator + 1);
}

export function fileToAttachment(file: File) {
  return new Promise<{ name: string; mimeType?: string; content: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve({
        name: file.name,
        mimeType: file.type || undefined,
        content: stripDataUrlPrefix(result) || result,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Whole percent of the upload completed, or `null` while the total is unknown
 * (no `Content-Length`), which the tray renders as an indeterminate state
 * rather than a misleading 0%.
 */
export function getUploadPercent(loaded: number, total?: number): number | null {
  if (!total || total <= 0 || !Number.isFinite(total)) return null;
  if (!Number.isFinite(loaded) || loaded < 0) return null;
  return Math.min(100, Math.max(0, Math.floor((loaded / total) * 100)));
}

/**
 * What a pending file's row should say. Real percentage beats a spinner here:
 * the wire time for 25 MB of base64 is tens of seconds no matter what the
 * client does, so telling the user how far along it is *is* the improvement.
 */
export function getAttachmentStatusLabel(options: {
  saveStatus: 'idle' | 'saving' | 'error';
  percent: number | null;
  sizeBytes: number;
}): string {
  const { saveStatus, percent, sizeBytes } = options;
  if (saveStatus === 'error') return 'Failed';
  if (saveStatus !== 'saving') return formatFileSize(sizeBytes);
  return percent === null ? 'Preparing…' : `Uploading ${percent}%`;
}

/**
 * Files that still have to go up. A file the server has already accepted must
 * never be encoded or uploaded again: the draft endpoint *adds* attachments,
 * so a repeat send does not just cost a second upload of the same bytes, it
 * puts the file on the message twice.
 */
export function getUnpreparedAttachments(files: File[], preparedKeys: ReadonlySet<string>): File[] {
  return files.filter((file) => !preparedKeys.has(fileKey(file)));
}

/**
 * Names the transport failure behind a preparation that did not complete —
 * a timeout, an unreachable server, a refused size, a server fault — each of
 * which needs a different next step from the user. Returns `null` when the
 * answer carries the server's own reason, which says more than anything
 * generic; the caller falls back to `getApiErrorMessage` there. None of these
 * may be swallowed: a silent failure is what left the composer stuck on
 * "Preparing attachments…" (elli-ui#910).
 */
export function getAttachmentTransportErrorMessage(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'Attaching the file timed out. Check your connection and try again.';
  }
  if (!error.response) {
    return 'Could not reach the mail server while attaching the file. Try again.';
  }
  const { status } = error.response;
  if (status === 413) return 'That file is too large for the mail server to accept.';
  if (status >= 500) {
    return 'The mail server could not store the attachment. Try again in a moment.';
  }
  return null;
}

/** The shape `getNewAttachments` needs off an already-uploaded attachment. */
export type AttachedFileDescriptor = { name: string; sizeBytes?: number };

/**
 * Whether `file` is one the composer is already carrying.
 *
 * Three ways it can be, and all three have to be checked (elli-ui#945):
 *
 * - It is still in the pending tray — an exact `fileKey` match.
 * - It was uploaded earlier in this composer session, so it has left the
 *   pending tray for `existingAttachments`. `preparedKeys` holds the `fileKey`
 *   of everything the server has taken, which is an exact match again.
 * - The composer was opened on a saved draft, so the attachment came back from
 *   the provider and there is no `fileKey` to compare. Name AND size together
 *   are the most identity the wire format carries; a file matching both is the
 *   same file for any purpose the user cares about, while a same-named file of
 *   a different size is a genuinely different attachment and still goes up.
 */
function isAlreadyAttached(
  file: File,
  pendingKeys: ReadonlySet<string>,
  preparedKeys: ReadonlySet<string>,
  existing: readonly AttachedFileDescriptor[]
): boolean {
  const key = fileKey(file);
  if (pendingKeys.has(key) || preparedKeys.has(key)) return true;
  return existing.some(
    (attachment) => attachment.name === file.name && attachment.sizeBytes === file.size
  );
}

export function getNewAttachments(
  files: FileList | null,
  current: File[],
  uploadedBytes: number,
  setError: (error: string | null) => void,
  /** `fileKey`s the server has already accepted for this composer. */
  preparedKeys: ReadonlySet<string> = new Set(),
  /** Attachments already on the draft, pending ones excluded. */
  existing: readonly AttachedFileDescriptor[] = []
): File[] {
  if (!files?.length) return [];
  const pendingKeys = new Set(current.map(fileKey));

  // Re-picking a file the composer already holds used to sail straight through
  // this filter, because it only ever looked at the pending tray — and a file
  // leaves the pending tray the moment its upload finishes. Selecting it again
  // then either uploaded the same bytes a second time and put the file on the
  // message twice, or, when the key was already prepared, added a tray row that
  // could never upload and never cleared: a phantom attachment that still
  // counted against the 25 MB budget. Both are elli-ui#945.
  const duplicates: File[] = [];
  const incoming = Array.from(files).filter((file) => {
    if (!isAlreadyAttached(file, pendingKeys, preparedKeys, existing)) return true;
    duplicates.push(file);
    return false;
  });

  // Accept files in the order they were picked while they fit the message
  // budget; everything that would push the total past the limit stays out.
  let usedBytes = uploadedBytes + current.reduce((total, file) => total + file.size, 0);
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of incoming) {
    if (usedBytes + file.size <= MAX_TOTAL_ATTACHMENT_BYTES) {
      accepted.push(file);
      usedBytes += file.size;
    } else {
      rejected.push(file);
    }
  }

  const messages: string[] = [];
  if (duplicates.length > 0) {
    const names = uniqueNames(duplicates).join(', ');
    messages.push(
      `${names} ${duplicates.length === 1 ? 'is' : 'are'} already attached, so ` +
        `${duplicates.length === 1 ? 'it was' : 'they were'} not added again.`
    );
  }
  if (rejected.length > 0) {
    const remaining = Math.max(0, MAX_TOTAL_ATTACHMENT_BYTES - usedBytes);
    const names = rejected.map((file) => `${file.name} (${formatFileSize(file.size)})`).join(', ');
    messages.push(
      `${names} ${rejected.length === 1 ? 'was' : 'were'} not attached — emails are limited to ` +
        `${formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} of attachments in total and ` +
        `${formatFileSize(remaining)} remains. Remove an attachment or send it in a separate email.`
    );
  }

  setError(messages.length > 0 ? messages.join(' ') : null);
  return accepted;
}

function uniqueNames(files: readonly File[]): string[] {
  return [...new Set(files.map((file) => file.name))];
}

/**
 * Encodes picked files for the wire, in the order they were attached.
 *
 * Deliberately at the send call rather than at the pick: a reply whose files
 * are read into base64 the moment they are chosen pays 4/3 of their size in
 * memory for as long as the draft is open, and pays it again for a draft that
 * is abandoned. Nothing is read until there is a message to put it on.
 */
export function encodeEmailAttachments(
  files: readonly File[]
): Promise<Array<{ name: string; mimeType?: string; content: string }>> {
  return Promise.all(files.map(fileToAttachment));
}
