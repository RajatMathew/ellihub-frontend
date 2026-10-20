import { FileFormatBadge } from '@/app/components/file-format-badge';
import { cn } from '@/app/lib/utils';
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { emailAttachmentDisplayName } from '@/modules/email/lib/email-attachments';
import { selectEmailRowAttachmentTiles } from '@/modules/email/lib/email-row-attachments';

type EmailRowAttachmentTilesProps = {
  attachments?: readonly EmailAttachment[];
  /**
   * Opens a file in the mailbox's preview dialog — the same one the reading
   * pane uses. Without it the tiles are labels only.
   */
  onOpen?: (attachment: EmailAttachment) => void;
};

const TILE_CLASSES =
  'inline-flex min-w-0 items-center gap-1.5 rounded-md border border-mail-line bg-mail-card py-0.5 pe-2 ps-0.5 text-start text-xs font-medium text-mail-mid';

/**
 * The files under a list row, named — the way Outlook and Gmail show what a
 * message brought without opening it.
 *
 * Drawn from the names and types the list already carries; nothing here
 * fetches until a tile is pressed. A tile is the file's format badge and its
 * name, so a row reads "PDF · Cofount proposal" at a glance; the third file
 * and beyond fold into a `+N`, keeping the strip to one line whatever the
 * count. The strip sits beside the row's own button, not inside it, so each
 * tile can be a real button that opens the file.
 */
export function EmailRowAttachmentTiles({ attachments, onOpen }: EmailRowAttachmentTilesProps) {
  const { tiles, overflow } = selectEmailRowAttachmentTiles(attachments);
  if (tiles.length === 0) return null;

  return (
    // Two equal columns and a slot for the count, capped at about the width
    // two desktop tiles took: a lone file draws the same box it would beside
    // a second one, on a phone and on a wide pane alike, rather than a fixed
    // width that matched the pair on one and overran it on the other.
    <div className="mt-1.5 grid max-w-md grid-cols-[1fr_1fr_auto] items-center gap-1.5">
      {tiles.map((attachment) => {
        const name = emailAttachmentDisplayName(attachment);
        const badge = (
          <FileFormatBadge
            fileName={attachment.name}
            mimeType={attachment.mimeType}
            className="size-6"
          />
        );

        return onOpen ? (
          <button
            key={attachment.id}
            type="button"
            className={cn(
              TILE_CLASSES,
              'cursor-pointer hover:bg-mail-chip-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-label={`Preview ${name}`}
            onClick={() => onOpen(attachment)}
          >
            {badge}
            <span className="truncate">{name}</span>
          </button>
        ) : (
          <span key={attachment.id} className={TILE_CLASSES}>
            {badge}
            <span className="truncate">{name}</span>
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-mail-muted">
          +{overflow}
        </span>
      )}
    </div>
  );
}
