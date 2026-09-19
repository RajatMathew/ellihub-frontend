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
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { emailAttachmentDisplayName } from '@/modules/email/lib/email-attachments';
import { SaveToFilesTrigger } from '@/modules/files/save-to-files';
import type { SaveToFilesSource } from '@/modules/files/save-to-files';
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
 * before the first tick — the thing the issue calls out by name. It floats over
 * the bottom of the attachment block rather than after it.
 */
export function EmailMessageAttachments({
  attachments,
  messageId,
  onLoadAttachment,
  onOpenAttachment,
  saveToFilesRootFolderId,
  saveToFilesRootLabel,
}: EmailMessageAttachmentsProps) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const canSelect = Boolean(onLoadAttachment) && attachments.length > 1;

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  // Selection order is not meaningful here — the bar acts on a set — so the
  // list keeps the message's own attachment order.
  const selected = useMemo(
    () => attachments.filter((attachment) => selectedIds.has(attachment.id)),
    [attachments, selectedIds]
  );

  return (
    <div className="relative px-4" aria-label="Message attachments">
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <EmailAttachmentCard
            key={attachment.id}
            attachment={attachment}
            messageId={messageId}
            selectable={canSelect}
            selected={selectedIds.has(attachment.id)}
            onToggleSelected={() => toggle(attachment.id)}
            onLoadAttachment={onLoadAttachment}
            onOpenAttachment={onOpenAttachment}
            saveToFilesRootFolderId={saveToFilesRootFolderId}
            saveToFilesRootLabel={saveToFilesRootLabel}
          />
        ))}
      </div>

      {selected.length > 0 && onLoadAttachment && (
        <EmailAttachmentSelectionBar
          attachments={selected}
          messageId={messageId}
          onLoadAttachment={onLoadAttachment}
          onClear={clear}
          saveToFilesRootFolderId={saveToFilesRootFolderId}
          saveToFilesRootLabel={saveToFilesRootLabel}
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
  selected,
  onToggleSelected,
  onLoadAttachment,
  onOpenAttachment,
  saveToFilesRootFolderId,
  saveToFilesRootLabel,
}: {
  attachment: EmailAttachment;
  messageId: string;
  selectable: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onLoadAttachment?: LoadAttachment;
  onOpenAttachment?: (attachment: EmailAttachment) => void;
  saveToFilesRootFolderId?: string;
  saveToFilesRootLabel?: string;
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

  return (
    <div
      className={cn(
        'flex min-w-0 max-w-72 items-center gap-1 rounded-lg border bg-mail-card py-1.5 pe-1 ps-2.5',
        // A ring rather than a thicker border: a border that grows on select
        // reflows the row of cards, which is the layout shift #1046 forbids.
        selected ? 'border-mail-accent ring-1 ring-mail-accent' : 'border-mail-line'
      )}
    >
      {selectable && (
        <SelectionCheck
          selected={selected}
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
        onOpen={() => onOpenAttachment?.(attachment)}
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
          <DropdownMenuItem onClick={() => onOpenAttachment?.(attachment)}>
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
              rootLabel={saveToFilesRootLabel ?? 'Project Files'}
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
  );
}

/**
 * The format badge, doubling as the checkbox.
 *
 * It sits exactly where the badge sits when nothing is selected and is the
 * same size, so ticking a card changes its colour and nothing else — no
 * control appears, and the row does not re-wrap.
 */
function SelectionCheck({
  selected,
  label,
  fileName,
  mimeType,
  onToggle,
}: {
  selected: boolean;
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
      className="group/select relative size-7 shrink-0 cursor-pointer rounded-[5px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onToggle}
    >
      <FileFormatBadge
        fileName={fileName}
        mimeType={mimeType}
        className={cn(
          'size-7 rounded-[5px]',
          selected && 'opacity-0',
          !selected && 'group-hover/select:opacity-0'
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 grid place-items-center rounded-[5px] border',
          selected
            ? 'border-mail-accent bg-mail-accent text-mail-accent-foreground'
            : 'border-mail-line bg-mail-card text-mail-mid opacity-0 group-hover/select:opacity-100'
        )}
      >
        <Check className="size-3.5" strokeWidth={2.6} />
      </span>
    </button>
  );
}

/**
 * The floating bar. Absolute, centred over the bottom of the attachment block,
 * so nothing below it moves when it appears.
 */
function EmailAttachmentSelectionBar({
  attachments,
  messageId,
  onLoadAttachment,
  onClear,
  saveToFilesRootFolderId,
  saveToFilesRootLabel,
}: {
  attachments: EmailAttachment[];
  messageId: string;
  onLoadAttachment: LoadAttachment;
  onClear: () => void;
  saveToFilesRootFolderId?: string;
  saveToFilesRootLabel?: string;
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
       Straddling the block's bottom edge rather than sitting inside it: at
       `bottom-0` the bar covered the last row of cards, which is the row you
       just ticked. Half of it now hangs over the gap above the body — which
       nothing else occupies, and which costs no height because the bar is
       absolute.
    */
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-1 rounded-full bg-mail-bulk-bar px-1.5 py-1 text-mail-bulk-bar-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-150"
      >
        <span className="px-2 text-xs font-medium">{count} selected</span>
        <span aria-hidden="true" className="h-4 w-px bg-mail-bulk-bar-muted/40" />

        <SaveToFilesTrigger
          asChild
          source={sources}
          rootFolderId={saveToFilesRootFolderId}
          rootLabel={saveToFilesRootLabel ?? 'Project Files'}
          title={`Save ${count} files to Files`}
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
          label={isDownloading ? 'Downloading attachments' : `Download ${count} attachments`}
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
