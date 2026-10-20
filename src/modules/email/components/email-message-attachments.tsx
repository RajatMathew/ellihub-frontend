import { useCallback, useMemo, useState } from 'react';

import { FileFormatBadge } from '@/app/components/file-format-badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { downloadBlob } from '@/app/lib/generated-pdf';
import { cn } from '@/app/lib/utils';
import { EmailAttachmentHoverCard } from '@/modules/email/components/email-attachment-hover-card';
import { EmailAttachmentThumbnail } from '@/modules/email/components/email-attachment-thumbnail';
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { getAttachmentThumbnailKind } from '@/modules/email/lib/email-attachment-thumbnail';
import { emailAttachmentDisplayName } from '@/modules/email/lib/email-attachments';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { SaveToFilesTrigger } from '@/modules/files/save-to-files';
import type { SaveToFilesScope, SaveToFilesSource } from '@/modules/files/save-to-files';
import { Check, ChevronDown, Download, FileSearch, FolderPlus, X } from 'lucide-react';
import { toast } from 'sonner';

type LoadAttachment = (messageId: string, attachmentId: string) => Promise<Blob>;

interface EmailMessageAttachmentsProps {
  attachments: EmailAttachment[];
  messageId: string;
  onLoadAttachment?: LoadAttachment;
  onOpenAttachment?: (attachment: EmailAttachment) => void;
  saveToFilesRootFolderId?: string;
  saveToFilesRootLabel?: string;
  saveToFilesProjects?: readonly SaveToFilesScope[];
}

/**
 * A message's attachments, above its body (elli-ui#1043) and selectable as a
 * set (elli-ui#1046).
 *
 * Filing four drawings into a project folder used to be four trips through the
 * same folder picker, one per chevron menu. Ticking them picks a folder once.
 *
 * **The bar must not move the message.** It is `absolute`, inside a wrapper
 * that reserves nothing for it, so the body below sits exactly where it sat
 * before the first tick — the thing the issue calls out by name. It hangs just
 * below the attachment block, centred, so it never covers a card.
 */
export function EmailMessageAttachments({
  attachments,
  messageId,
  onLoadAttachment,
  onOpenAttachment,
  saveToFilesRootFolderId,
  saveToFilesRootLabel,
  saveToFilesProjects,
}: EmailMessageAttachmentsProps) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const canSelect = Boolean(onLoadAttachment) && attachments.length > 0;
  // One thumbnail turns the whole row into tiles (elli-ui#1361): a tile beside
  // a chip read as two kinds of thing. A message of zips stays compact.
  const asTiles =
    Boolean(onLoadAttachment) &&
    attachments.some((attachment) => getAttachmentThumbnailKind(attachment) !== null);

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback(
    () => setSelectedIds(new Set(attachments.map((attachment) => attachment.id))),
    [attachments]
  );

  // Selection order is not meaningful here — the bar acts on a set — so the
  // list keeps the message's own attachment order.
  const selected = useMemo(
    () => attachments.filter((attachment) => selectedIds.has(attachment.id)),
    [attachments, selectedIds]
  );

  return (
    <div className="relative px-4" aria-label="Message attachments">
      <div
        className={cn(
          'gap-2',
          // Tiles sit two to a row on a phone-width pane — a fixed 224px tile
          // left one per row with the rest of the width empty. `@md` measures
          // the reading pane's `@container`, not the window, so a narrow pane
          // beside the list on desktop gets the same treatment.
          asTiles ? 'grid grid-cols-2 @md:flex @md:flex-wrap' : 'flex flex-wrap'
        )}
      >
        {attachments.map((attachment) => (
          <EmailAttachmentCard
            key={attachment.id}
            attachment={attachment}
            messageId={messageId}
            selectable={canSelect}
            asTile={asTiles}
            selecting={selectedIds.size > 0}
            selected={selectedIds.has(attachment.id)}
            onToggleSelected={() => toggle(attachment.id)}
            onLoadAttachment={onLoadAttachment}
            onOpenAttachment={onOpenAttachment}
            saveToFilesRootFolderId={saveToFilesRootFolderId}
            saveToFilesRootLabel={saveToFilesRootLabel}
            saveToFilesProjects={saveToFilesProjects}
          />
        ))}
      </div>

      {selected.length > 0 && onLoadAttachment && (
        <EmailAttachmentSelectionBar
          attachments={selected}
          total={attachments.length}
          messageId={messageId}
          onLoadAttachment={onLoadAttachment}
          onSelectAll={selectAll}
          onClear={clear}
          saveToFilesRootFolderId={saveToFilesRootFolderId}
          saveToFilesRootLabel={saveToFilesRootLabel}
          saveToFilesProjects={saveToFilesProjects}
        />
      )}
    </div>
  );
}

/**
 * One attachment, as a card rather than a chip (elli-ui#1017).
 *
 * The chip put the name and the size on one line and hung a bare "add to
 * folder" icon off the side, so the only two things you can do with a file
 * were one visible button and one that was not there at all. Actions live
 * behind a single chevron — preview, download, save to Files — and the name
 * gets the card's whole width to truncate against.
 */
function EmailAttachmentCard({
  attachment,
  messageId,
  selectable,
  asTile,
  selecting,
  selected,
  onToggleSelected,
  onLoadAttachment,
  onOpenAttachment,
  saveToFilesRootFolderId,
  saveToFilesRootLabel,
  saveToFilesProjects,
}: {
  attachment: EmailAttachment;
  messageId: string;
  selectable: boolean;
  /** Drawn as a tile with a thumbnail above the file row, Outlook-style. */
  asTile: boolean;
  /** Something in this message is already ticked, so every card shows its box. */
  selecting: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onLoadAttachment?: LoadAttachment;
  onOpenAttachment?: (attachment: EmailAttachment) => void;
  saveToFilesRootFolderId?: string;
  saveToFilesRootLabel?: string;
  saveToFilesProjects?: readonly SaveToFilesScope[];
}) {
  const resolveAttachment = useCallback(async (): Promise<Blob> => {
    if (!onLoadAttachment) {
      throw new Error('This attachment cannot be downloaded right now.');
    }
    return onLoadAttachment(messageId, attachment.id);
  }, [attachment.id, messageId, onLoadAttachment]);

  const canSaveToFiles = Boolean(onLoadAttachment);
  // Saved under the same name the card shows and the download sends.
  const displayName = emailAttachmentDisplayName(attachment);
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async () => {
    if (!onLoadAttachment || isDownloading) return;
    setIsDownloading(true);
    try {
      downloadBlob(await resolveAttachment(), displayName);
    } catch {
      // The attachment never arrived, so there is nothing to save. Say so here
      // rather than leaving a menu item that silently does nothing.
      toast.error(`Could not download ${displayName}.`);
    } finally {
      setIsDownloading(false);
    }
  };

  const thumbnailKind = asTile ? getAttachmentThumbnailKind(attachment) : null;
  const open = () => onOpenAttachment?.(attachment);

  return (
    <div
      className={cn(
        // `group/card`: the checkbox reveals on hover of the whole card, not
        // just the badge. Hovering the name opens the preview, and the box has
        // to be showing then too or nobody finds it.
        'group/card min-w-0 rounded-lg border bg-mail-card',
        asTile ? 'flex w-full flex-col overflow-hidden @md:w-56' : 'max-w-72',
        // A ring rather than a thicker border: a border that grows on select
        // reflows the row of cards, which is the layout shift #1046 forbids.
        selected ? 'border-mail-accent ring-1 ring-mail-accent' : 'border-mail-line'
      )}
    >
      {asTile &&
        (thumbnailKind ? (
          <EmailAttachmentThumbnail
            cacheKey={`${messageId}:${attachment.id}`}
            kind={thumbnailKind}
            fileName={displayName}
            mimeType={attachment.mimeType}
            load={resolveAttachment}
            onOpen={open}
          />
        ) : (
          // Too large, or a format nothing here can draw: the same box, so the
          // row of tiles stays level, holding the file's icon instead.
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="grid h-24 w-full cursor-pointer place-items-center border-b border-mail-line @md:h-32"
            onClick={open}
          >
            <FileTypeIcon
              fileType="FILE"
              mimeType={attachment.mimeType}
              fileName={displayName}
              className="size-10"
            />
          </button>
        ))}

      {/*
        The badge is size-9, the height of the name + size lines (leading-5 +
        leading-4), so the row's py-1.5 plus the preview button's py-1 puts
        10px above and below it — matching ps-2.5 on the left.
      */}
      <div className="flex min-w-0 items-center gap-1 py-1.5 pe-1 ps-2.5">
        {selectable && (
          <SelectionCheck
            selected={selected}
            revealed={selecting}
            label={displayName}
            fileName={displayName}
            mimeType={attachment.mimeType}
            onToggle={onToggleSelected}
          />
        )}

        <EmailAttachmentHoverCard
          attachment={attachment}
          messageId={messageId}
          loadAttachment={onLoadAttachment}
          hideBadge={selectable}
          onOpen={open}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              mode="icon"
              size="sm"
              className="size-7 shrink-0"
              aria-label={`Actions for ${displayName}`}
              title="Actions"
            >
              <ChevronDown aria-hidden="true" className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={open}>
              <FileSearch aria-hidden="true" />
              Preview
            </DropdownMenuItem>
            {onLoadAttachment && (
              <DropdownMenuItem disabled={isDownloading} onClick={() => void download()}>
                <Download aria-hidden="true" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </DropdownMenuItem>
            )}
            {canSaveToFiles && (
              <SaveToFilesTrigger
                asChild
                source={{
                  kind: 'lazy',
                  fileName: displayName,
                  mimeType: attachment.mimeType ?? undefined,
                  resolve: resolveAttachment,
                }}
                rootFolderId={saveToFilesRootFolderId}
                rootLabel={saveToFilesRootLabel ?? 'Files'}
                projectScopes={saveToFilesProjects}
                onSaved={() => toast.success(`Saved ${displayName} to Files.`)}
              >
                {/* The picker owns its own dialog, so the menu must not close
                  this item out from under it on select. */}
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  <FolderPlus aria-hidden="true" />
                  Add to folder
                </DropdownMenuItem>
              </SaveToFilesTrigger>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * The format badge, doubling as the checkbox.
 *
 * It sits exactly where the badge sits when nothing is selected and is the
 * same size, so ticking a card changes its colour and nothing else — no
 * control appears, and the row does not re-wrap.
 *
 * The empty box shows while the card is hovered or focused, and on every card
 * once one is ticked — the Outlook pattern, where a selection in progress
 * shows you what else can join it.
 */
function SelectionCheck({
  selected,
  revealed,
  label,
  fileName,
  mimeType,
  onToggle,
}: {
  selected: boolean;
  revealed: boolean;
  label: string;
  fileName: string;
  mimeType?: string | null;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Select ${label}`}
      className="relative me-1.5 size-9 shrink-0 cursor-pointer rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onToggle}
    >
      <FileFormatBadge
        fileName={fileName}
        mimeType={mimeType}
        className={cn(
          'size-9',
          (selected || revealed) && 'opacity-0',
          'group-focus-within/card:opacity-0 group-hover/card:opacity-0'
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 grid place-items-center rounded-md border',
          selected
            ? 'border-mail-accent bg-mail-accent text-mail-accent-foreground'
            : cn(
                'border-mail-line bg-mail-card text-transparent group-focus-within/card:opacity-100 group-hover/card:opacity-100 hover:text-mail-mid',
                !revealed && 'opacity-0'
              )
        )}
      >
        <Check className="size-4" strokeWidth={2.6} />
      </span>
    </button>
  );
}

/**
 * The floating bar. Absolute, hung below the right edge of the attachment
 * block, so nothing below it moves when it appears and no card is covered.
 */
function EmailAttachmentSelectionBar({
  attachments,
  total,
  messageId,
  onLoadAttachment,
  onSelectAll,
  onClear,
  saveToFilesRootFolderId,
  saveToFilesRootLabel,
  saveToFilesProjects,
}: {
  attachments: EmailAttachment[];
  /** Every attachment on the message, for the select-all box. */
  total: number;
  messageId: string;
  onLoadAttachment: LoadAttachment;
  onSelectAll: () => void;
  onClear: () => void;
  saveToFilesRootFolderId?: string;
  saveToFilesRootLabel?: string;
  saveToFilesProjects?: readonly SaveToFilesScope[];
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const count = attachments.length;

  // `lazy`, like the single-file menu item: nothing is fetched until a folder
  // is confirmed, so opening the picker over five 20MB drawings costs nothing.
  const sources = useMemo<SaveToFilesSource[]>(
    () =>
      attachments.map((attachment) => ({
        kind: 'lazy' as const,
        fileName: emailAttachmentDisplayName(attachment),
        mimeType: attachment.mimeType ?? undefined,
        resolve: () => onLoadAttachment(messageId, attachment.id),
      })),
    [attachments, messageId, onLoadAttachment]
  );

  const downloadAll = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      // Sequential on purpose: each one is a provider round trip, and the
      // browser drops all but the first of a burst of simultaneous downloads.
      for (const attachment of attachments) {
        const name = emailAttachmentDisplayName(attachment);
        downloadBlob(await onLoadAttachment(messageId, attachment.id), name);
      }
    } catch {
      toast.error('Could not download every attachment.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    /*
       Below the block, not over it: straddling the bottom edge still covered
       the last row of cards — the row you just ticked. `top-full` puts the bar
       entirely under the cards, centred on the message, floating over the top
       of the body. It is absolute, so it costs the message no height.
    */
    <div className="pointer-events-none absolute inset-x-4 top-full z-10 mt-2 flex justify-center">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-1 rounded-full bg-mail-bulk-bar px-1.5 py-1 text-mail-bulk-bar-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-150"
      >
        {/* One attachment is already "all" — the box would just duplicate ×. */}
        {total > 1 && (
          <>
            <SelectAllCheck
              checked={count === total}
              onToggle={count === total ? onClear : onSelectAll}
            />
            <span aria-hidden="true" className="h-4 w-px bg-mail-bulk-bar-muted/40" />
          </>
        )}
        <span className="px-2 text-xs font-medium">{count} selected</span>
        <span aria-hidden="true" className="h-4 w-px bg-mail-bulk-bar-muted/40" />

        <SaveToFilesTrigger
          asChild
          source={sources}
          rootFolderId={saveToFilesRootFolderId}
          rootLabel={saveToFilesRootLabel ?? 'Files'}
          projectScopes={saveToFilesProjects}
          // One file falls through to the dialog's own singular heading.
          title={count > 1 ? `Save ${count} files to Files` : undefined}
          onSaved={() => undefined}
          onOpenChange={(open) => {
            if (!open) onClear();
          }}
        >
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium hover:bg-mail-bulk-bar-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FolderPlus aria-hidden="true" className="size-3.5" />
            Add to folder
          </button>
        </SaveToFilesTrigger>

        <BarIconAction
          label={
            isDownloading
              ? 'Downloading attachments'
              : count > 1
                ? `Download ${count} attachments`
                : 'Download attachment'
          }
          disabled={isDownloading}
          onClick={() => void downloadAll()}
        >
          <Download aria-hidden="true" className="size-3.5" />
        </BarIconAction>

        <BarIconAction label="Clear selection" onClick={onClear}>
          <X aria-hidden="true" className="size-3.5" />
        </BarIconAction>
      </div>
    </div>
  );
}

/**
 * A labelled checkbox, not a bare glyph: an unlabelled dash beside "1 selected"
 * read as a minus button. Empty until every attachment is ticked; ticking it
 * selects the rest, unticking it clears.
 */
function SelectAllCheck({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className="flex cursor-pointer items-center gap-1.5 rounded-full py-1 pe-2.5 ps-2 text-xs font-medium hover:bg-mail-bulk-bar-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onToggle}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-3.5 place-items-center rounded-sm border',
          checked
            ? 'border-mail-bulk-bar-foreground bg-mail-bulk-bar-foreground text-mail-bulk-bar'
            : 'border-mail-bulk-bar-muted text-transparent'
        )}
      >
        <Check className="size-2.5" strokeWidth={3.5} />
      </span>
      Select all
    </button>
  );
}

function BarIconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-mail-bulk-bar-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
