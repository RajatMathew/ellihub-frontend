import {
  isHiddenInlineEmailAttachment,
  type EmailAttachmentMetadata,
} from '@/modules/email/lib/email-attachments';

/**
 * How many files a list row names before it folds the rest into `+N`.
 *
 * Two: on a phone the list pane is the screen, and a third tile squeezed
 * every name down to its first word. The strip is one line whatever the
 * count, so a row with ten PDFs is the same height as a row with one.
 */
export const EMAIL_ROW_ATTACHMENT_TILE_LIMIT = 2;

export type EmailRowAttachmentTiles<T> = {
  /** The files the row names, in the order they were attached. */
  tiles: T[];
  /** How many more the row has than it names. */
  overflow: number;
};

/**
 * Which of a message's files the list row shows, and how many it leaves unnamed.
 *
 * Drawn from the row's own message, not the whole thread: the paperclip beside
 * the date already counts the conversation, and naming files from an earlier
 * reply under a later one would put them on the wrong message.
 *
 * Inline images — a signature logo, a tracking pixel — stay out, by the same
 * test the reading pane applies (`isHiddenInlineEmailAttachment`), so a row
 * with a company logo in its footer does not grow a tile for it.
 */
export function selectEmailRowAttachmentTiles<T extends EmailAttachmentMetadata>(
  attachments: readonly T[] | undefined,
  limit = EMAIL_ROW_ATTACHMENT_TILE_LIMIT
): EmailRowAttachmentTiles<T> {
  const visible = (attachments ?? []).filter(
    (attachment) => !isHiddenInlineEmailAttachment(attachment)
  );
  return {
    tiles: visible.slice(0, limit),
    overflow: Math.max(0, visible.length - limit),
  };
}
