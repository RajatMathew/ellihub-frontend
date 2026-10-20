/**
 * One description of an attached file, whatever composer is holding it.
 *
 * The two editors carry attachments in two different shapes and always have:
 * a new message uploads each file to its draft as it is picked, so it holds
 * `File`s that are still going up *and* `EmailAttachment` rows the server has
 * already taken; a reply holds nothing but `File`s and encodes them at send.
 * That difference is real, but it is the only one — and it was enough to give
 * the two surfaces two separate trays, which then drifted until one of them
 * had no picker at all (elli-ui#1189).
 *
 * So the difference is flattened here, in a pure function, and the tray renders
 * the result. It takes no callbacks and closes over nothing: `kind` and `id`
 * are what a caller removes by, which keeps this testable without a renderer —
 * the only kind of test this repo's unit suite can run.
 */

import {
  fileKey,
  formatFileSize,
  getAttachmentStatusLabel,
} from '@/modules/email/lib/email-compose-attachments';

export type ComposeAttachmentKind =
  /** Picked in this composer and not yet accepted by the server. */
  | 'pending'
  /** Already on the draft — uploaded earlier, or loaded with it. */
  | 'stored';

export interface ComposeAttachmentItem {
  /** Identity within its own `kind`; the two namespaces never mix. */
  id: string;
  kind: ComposeAttachmentKind;
  name: string;
  sizeBytes: number;
  /** The right-hand read-out: a size, an upload percentage, `Ready`, `Failed`. */
  statusLabel: string;
  /** The read-out is a failure and should be drawn as one. */
  hasFailed: boolean;
  /** 0–100 while this file is uploading, else null. */
  progress: number | null;
  /** Removing it aborts an upload in flight rather than just dropping a row. */
  cancels: boolean;
}

/** An attachment the server already holds, narrowed to what the tray draws. */
export interface StoredComposeAttachment {
  id: string;
  name: string;
  sizeBytes?: number | null;
}

export interface ComposeAttachmentItemsInput {
  /** Files picked here and not yet accepted by the server. */
  pending?: readonly File[];
  /** Attachments the draft already carries. Empty for a reply or a forward. */
  stored?: readonly StoredComposeAttachment[];
  /** The draft's autosave state — what decides a pending file's read-out. */
  saveStatus?: 'idle' | 'saving' | 'error';
  /** Upload progress of the batch in flight, 0–100. */
  progress?: number | null;
  /** An upload is in flight, so removing a pending file cancels it. */
  isPreparing?: boolean;
}

/**
 * Stored attachments first, then pending ones — the order they were attached
 * in, since anything stored was picked before anything still going up.
 */
export function composeAttachmentItems({
  pending = [],
  stored = [],
  saveStatus = 'idle',
  progress = null,
  isPreparing = false,
}: ComposeAttachmentItemsInput): ComposeAttachmentItem[] {
  const storedItems: ComposeAttachmentItem[] = stored.map((attachment) => ({
    id: attachment.id,
    kind: 'stored',
    name: attachment.name,
    sizeBytes: attachment.sizeBytes ?? 0,
    statusLabel: 'Ready',
    hasFailed: false,
    progress: null,
    cancels: false,
  }));

  const pendingItems: ComposeAttachmentItem[] = pending.map((file) => ({
    // The same identity the duplicate check uses, so a row and the file it
    // stands for cannot disagree about which file it is.
    id: fileKey(file),
    kind: 'pending',
    name: file.name,
    sizeBytes: file.size,
    statusLabel: getAttachmentStatusLabel({
      saveStatus,
      percent: progress,
      sizeBytes: file.size,
    }),
    hasFailed: saveStatus === 'error',
    progress: saveStatus === 'saving' ? progress : null,
    cancels: isPreparing,
  }));

  return [...storedItems, ...pendingItems];
}

/** What the tray's budget line reads, and whether it reads as an error. */
export function composeAttachmentBudget(totalBytes: number, maxBytes: number) {
  return {
    overBudget: totalBytes > maxBytes,
    label:
      totalBytes > 0
        ? `${formatFileSize(totalBytes)} of ${formatFileSize(maxBytes)} used`
        : `or drop them anywhere, up to ${formatFileSize(maxBytes)}`,
  };
}

/** Total bytes a composer is carrying, across both kinds. */
export function composeAttachmentBytes(items: readonly ComposeAttachmentItem[]): number {
  return items.reduce((total, item) => total + item.sizeBytes, 0);
}
