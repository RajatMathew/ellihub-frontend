import { useRef, useState, type ReactNode } from 'react';

import { FileFormatBadge } from '@/app/components/file-format-badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Progress } from '@/app/components/ui/progress';
import { cn } from '@/app/lib/utils';
import { EllihubFilePickerDialog } from '@/modules/email/components/compose/ellihub-file-picker-dialog';
import { toFileList } from '@/modules/email/lib/ellihub-file-picker';
import {
  composeAttachmentBudget,
  type ComposeAttachmentItem,
} from '@/modules/email/lib/email-compose-attachment-items';
import {
  formatFileSize,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '@/modules/email/lib/email-compose-attachments';
import { AlertCircle, FolderOpen, Paperclip, Trash2, Upload, X } from 'lucide-react';

export interface EmailComposeAttachmentTrayProps {
  /** Every attached file, already flattened by `composeAttachmentItems`. */
  items: readonly ComposeAttachmentItem[];
  /** Total across `items` — passed in because a caller may count it its own way. */
  totalBytes: number;
  /** A file that was refused: too large, a duplicate, an upload that failed. */
  error?: string | null;
  /** Id for the hidden input, so a label elsewhere can drive the picker. */
  inputId?: string;
  maxBytes?: number;
  /** An upload is in flight; the tray says so to assistive technology. */
  isPreparing?: boolean;
  /** The whole tray is inert — the message is going out. */
  disabled?: boolean;
  /**
   * The picker row ("Attach files", and the budget beside it).
   *
   * Every full-page editor shows it: it is the only affordance that says
   * attaching is possible at all, and the reply editor shipped without one
   * (elli-ui#1189). The compact in-thread card turns it off because its own
   * toolbar already carries a paperclip, and a second one below the editor
   * would be two buttons for one job.
   */
  picker?: boolean;
  onSelect: (files: FileList | null) => void;
  onRemove: (item: ComposeAttachmentItem) => void;
  /** Absent where clearing one by one is the only removal a surface offers. */
  onRemoveAll?: () => void;
}

/**
 * The attachment tray: the picker, one row per attached file with whatever
 * state it is in, and the two error states (a refused file, and a message over
 * the provider's budget).
 *
 * One component for every composer — a new message, a draft, a reply, a forward
 * (elli-ui#1189). It takes plain data and two callbacks, and knows nothing
 * about `useEmailCompose`: the controller is one caller of it, not its subject.
 * That is the whole reason the reply composer can render it at all, since a
 * reply has no draft and no controller.
 */
export function EmailComposeAttachmentTray({
  items,
  totalBytes,
  error,
  inputId,
  maxBytes = MAX_TOTAL_ATTACHMENT_BYTES,
  isPreparing = false,
  disabled = false,
  picker = true,
  onSelect,
  onRemove,
  onRemoveAll,
}: EmailComposeAttachmentTrayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filesPickerOpen, setFilesPickerOpen] = useState(false);
  const budget = composeAttachmentBudget(totalBytes, maxBytes);

  // Nothing to say and nothing to offer: draw no rule and take no height.
  if (!picker && items.length === 0 && !error) return null;

  return (
    <div aria-busy={isPreparing}>
      {picker && (
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          // Cleared on every pick so choosing the same file twice in a row
          // still fires a change event; the duplicate is then caught by name
          // and size.
          onChange={(event) => {
            onSelect(event.target.files);
            event.target.value = '';
          }}
        />
      )}

      {picker && (
        /* One line, not a drop-box: dragging anywhere over the composer already
           raises its own "Drop files to attach" overlay, so a second, larger
           target for the same gesture was only spending vertical space. */
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-5 py-2">
          {/* From this computer, or from ElliHub's own Files (elli-ui#1335). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="-ms-2" disabled={disabled}>
                <Paperclip className="size-3.5" aria-hidden="true" />
                Attach files
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
                <Upload aria-hidden="true" />
                Upload files
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFilesPickerOpen(true)}>
                <FolderOpen aria-hidden="true" />
                Select from ElliHub files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <EllihubFilePickerDialog
            open={filesPickerOpen}
            onOpenChange={setFilesPickerOpen}
            onPick={(files) => onSelect(toFileList(files))}
          />
          <p
            className={cn(
              'min-w-0 truncate text-xs',
              budget.overBudget ? 'font-medium text-destructive' : 'text-muted-foreground'
            )}
          >
            {budget.label}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="px-5 pb-3 pt-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              {items.length} {items.length === 1 ? 'attachment' : 'attachments'}
            </p>
            {onRemoveAll && (
              <button
                type="button"
                className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                onClick={onRemoveAll}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove all
              </button>
            )}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2" aria-label="Selected attachments">
            {items.map((item) => (
              <li
                key={`${item.kind}:${item.id}`}
                className="relative flex min-w-0 items-center gap-2 overflow-hidden rounded-md border border-border bg-background px-2.5 py-2"
              >
                <FileFormatBadge fileName={item.name} className="size-5" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{item.name}</span>
                <span
                  className={cn(
                    'shrink-0 text-xs font-medium tabular-nums',
                    item.hasFailed
                      ? 'text-destructive'
                      : item.kind === 'stored'
                        ? 'text-emerald-600'
                        : 'text-muted-foreground'
                  )}
                >
                  {item.statusLabel}
                </span>
                <button
                  type="button"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  // Stays live while the file is preparing: cancelling is the
                  // only way out of an upload that never answers (elli-ui#910).
                  aria-label={`${item.cancels ? 'Cancel' : 'Remove'} ${item.name}`}
                  disabled={disabled && !item.cancels}
                  onClick={() => onRemove(item)}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
                {item.progress !== null && (
                  <Progress
                    value={item.progress}
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 rounded-none"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <ComposeAttachmentAlert title="Attachment wasn’t added">{error}</ComposeAttachmentAlert>
      )}
      {budget.overBudget && (
        <ComposeAttachmentAlert title="Attachments exceed the email limit">
          This email carries {formatFileSize(totalBytes)} of attachments but only{' '}
          {formatFileSize(maxBytes)} can be delivered. Remove attachments until the total fits —
          sending is disabled until then.
        </ComposeAttachmentAlert>
      )}
    </div>
  );
}

function ComposeAttachmentAlert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mx-5 mb-3 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-xs leading-5">
        <p className="font-semibold">{title}</p>
        <p className="text-destructive/85">{children}</p>
      </div>
    </div>
  );
}
