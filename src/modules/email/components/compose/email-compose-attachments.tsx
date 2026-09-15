import { useRef } from 'react';

import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { cn } from '@/app/lib/utils';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';
import {
  fileKey,
  formatFileSize,
  getAttachmentStatusLabel,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '@/modules/email/lib/email-compose-attachments';
import { AlertCircle, FileText, Paperclip, Trash2, X } from 'lucide-react';

/**
 * The attachment tray: the picker, the per-file rows with their preparation
 * state, and the two error states (a rejected file, and a message over budget).
 */
export function EmailComposeAttachments({ compose }: { compose: EmailComposeController }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    attachmentInputId,
    attachments,
    existingAttachments,
    attachmentError,
    totalAttachmentBytes,
    attachmentsOverBudget,
    saveStatus,
    isPreparingAttachments,
    attachmentProgress,
  } = compose;
  const attachmentCount = attachments.length + existingAttachments.length;

  return (
    <div aria-busy={isPreparingAttachments}>
      <input
        ref={inputRef}
        id={attachmentInputId}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          compose.handleAttachmentSelection(event.target.files);
          event.target.value = '';
        }}
      />
      {/* One line, not a drop-box: dragging anywhere over the composer already
          raises its own "Drop files to attach" overlay, so a second, larger
          target for the same gesture was only spending vertical space. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-5 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ms-2"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="size-3.5" aria-hidden="true" />
          Attach files
        </Button>
        <p
          className={cn(
            'min-w-0 truncate text-xs',
            attachmentsOverBudget ? 'font-medium text-destructive' : 'text-muted-foreground'
          )}
        >
          {totalAttachmentBytes > 0
            ? `${formatFileSize(totalAttachmentBytes)} of ${formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} used`
            : `or drop them anywhere, up to ${formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)}`}
        </p>
      </div>

      {attachmentCount > 0 && (
        <div className="px-5 pb-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              {attachmentCount} {attachmentCount === 1 ? 'attachment' : 'attachments'}
            </p>
            <button
              type="button"
              className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                compose.removePendingAttachments([]);
                compose.setRemovedAttachmentIds((current) => [
                  ...new Set([
                    ...current,
                    ...existingAttachments.map((attachment) => attachment.id),
                  ]),
                ]);
                compose.setExistingAttachments([]);
              }}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove all
            </button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2" aria-label="Selected attachments">
            {existingAttachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {attachment.name}
                </span>
                <span className="shrink-0 text-[11px] font-medium text-emerald-600">Ready</span>
                <button
                  type="button"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${attachment.name}`}
                  disabled={isPreparingAttachments}
                  onClick={() => {
                    compose.setExistingAttachments((current) =>
                      current.filter((item) => item.id !== attachment.id)
                    );
                    compose.setRemovedAttachmentIds((current) => [...current, attachment.id]);
                  }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            {attachments.map((file) => (
              <li
                // The same identity the dedupe uses. Name and timestamp alone
                // collide for two files of different sizes saved in the same
                // millisecond, and React then reuses one row's DOM for the
                // other — the wrong name against the wrong progress bar.
                key={fileKey(file)}
                className="relative flex min-w-0 items-center gap-2 overflow-hidden rounded-md border border-border bg-background px-2.5 py-2"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{file.name}</span>
                <span
                  className={cn(
                    'shrink-0 text-xs font-medium tabular-nums',
                    saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {getAttachmentStatusLabel({
                    saveStatus,
                    percent: attachmentProgress,
                    sizeBytes: file.size,
                  })}
                </span>
                <button
                  type="button"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  // Stays live while the file is preparing: cancelling is the
                  // only way out of an upload that never answers (elli-ui#910).
                  aria-label={
                    isPreparingAttachments ? `Cancel ${file.name}` : `Remove ${file.name}`
                  }
                  onClick={() =>
                    compose.removePendingAttachments(attachments.filter((item) => item !== file))
                  }
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
                {saveStatus === 'saving' && attachmentProgress !== null && (
                  <Progress
                    value={attachmentProgress}
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 rounded-none"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {attachmentError && (
        <ComposeAttachmentAlert title="Attachment wasn’t added">
          {attachmentError}
        </ComposeAttachmentAlert>
      )}
      {attachmentsOverBudget && (
        <ComposeAttachmentAlert title="Attachments exceed the email limit">
          This email carries {formatFileSize(totalAttachmentBytes)} of attachments but only{' '}
          {formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} can be delivered. Remove attachments until
          the total fits — sending is disabled until then.
        </ComposeAttachmentAlert>
      )}
    </div>
  );
}

function ComposeAttachmentAlert({ title, children }: { title: string; children: React.ReactNode }) {
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
