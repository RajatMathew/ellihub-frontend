/**
 * Which attachments get a first-page thumbnail on the message, Outlook-style
 * (elli-ui#1361).
 *
 * A thumbnail is not free: there is no thumbnail endpoint, so drawing one means
 * downloading the whole file through elli-core, which reads it from the
 * provider on every request. Opening a message with five 20MB drawings must not
 * cost 100MB, so each kind has a size cap and anything over it keeps its format
 * badge. The caps are lower for the kinds that are expensive to lay out, not
 * just to fetch — a workbook builds its whole grid.
 *
 * Decided from the metadata alone, before anything is fetched, so the card's
 * shape is known on first render and never changes under the reader.
 *
 * Pure, so the branchy part is tested rather than discovered in a mailbox.
 */

import { resolveAttachmentMimeType } from '@/modules/email/lib/email-attachment-preview';
import { isDocxPreviewable } from '@/modules/files/lib/file-preview-docx';
import { isWorkbookPreviewable } from '@/modules/files/lib/file-preview-spreadsheet';

export type AttachmentThumbnailKind = 'image' | 'pdf' | 'docx' | 'workbook';

type ThumbnailAttachment = {
  name: string;
  mimeType?: string | null;
  sizeBytes?: number;
};

const MB = 1024 * 1024;

export const MAX_THUMBNAIL_BYTES: Record<AttachmentThumbnailKind, number> = {
  image: 8 * MB,
  pdf: 8 * MB,
  docx: 4 * MB,
  workbook: 2 * MB,
};

/**
 * Images a browser can decode into a canvas. HEIC and TIFF are images the
 * hover card names correctly but Chrome cannot draw; SVG never reaches a
 * renderer at all (see `NEVER_RENDER_MIME_TYPES`).
 */
const DRAWABLE_IMAGE_TYPES = new Set([
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function kindOf(attachment: ThumbnailAttachment): AttachmentThumbnailKind | null {
  const mimeType = resolveAttachmentMimeType(attachment);
  if (DRAWABLE_IMAGE_TYPES.has(mimeType)) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (isDocxPreviewable(attachment)) return 'docx';
  if (isWorkbookPreviewable(attachment)) return 'workbook';
  return null;
}

/**
 * The thumbnail to draw for this attachment, or `null` for the badge.
 *
 * A file with no size is not trusted to be small: a provider that leaves it out
 * is as likely to be hiding a 40MB scan as a 40KB one.
 */
export function getAttachmentThumbnailKind(
  attachment: ThumbnailAttachment
): AttachmentThumbnailKind | null {
  const kind = kindOf(attachment);
  if (!kind) return null;

  const size = attachment.sizeBytes;
  if (size === undefined || size <= 0 || size > MAX_THUMBNAIL_BYTES[kind]) return null;

  return kind;
}

/**
 * Runs at most `max` tasks at once and queues the rest in order.
 *
 * Every thumbnail is a whole file read through the provider, and a thread can
 * open with a dozen of them on screen. Started together they compete for the
 * same connection with the body the reader is actually waiting for, and the
 * first thumbnail arrives no sooner than the last.
 */
export function createTaskLimiter(max: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (running >= max) return;
    const start = queue.shift();
    if (!start) return;
    running += 1;
    start();
  };

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            running -= 1;
            next();
          });
      });
      next();
    });
  };
}

/**
 * A small least-recently-used map that runs `onEvict` on whatever falls out —
 * for thumbnails, revoking the object URL so the image is actually freed.
 */
export function createLruCache<V>(capacity: number, onEvict: (value: V) => void) {
  const entries = new Map<string, V>();

  return {
    get(key: string): V | undefined {
      const value = entries.get(key);
      if (value === undefined) return undefined;
      // Re-inserted so it becomes the newest.
      entries.delete(key);
      entries.set(key, value);
      return value;
    },
    set(key: string, value: V) {
      const previous = entries.get(key);
      entries.delete(key);
      if (previous !== undefined && previous !== value) onEvict(previous);
      entries.set(key, value);
      while (entries.size > capacity) {
        const oldest = entries.keys().next();
        if (oldest.done) break;
        const evicted = entries.get(oldest.value);
        entries.delete(oldest.value);
        if (evicted !== undefined) onEvict(evicted);
      }
    },
    get size() {
      return entries.size;
    },
  };
}
