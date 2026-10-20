import { useRef, type ChangeEvent } from 'react';

import { FileFormatBadge } from '@/app/components/file-format-badge';
import { Button } from '@/app/components/ui/button';
import { Paperclip, X } from 'lucide-react';

import { recordAttachmentName, type RecordAttachment } from './record-actions';

/**
 * The files a proposed record will carry. While the card waits for approval
 * the user can drop one Elliot found or add one from their computer; a picked
 * file stays in the browser until the record exists to upload it into.
 */
export function RecordActionAttachments({
  attachments,
  editable,
  multiple,
  required,
  emptyHint,
  onChange,
}: {
  attachments: RecordAttachment[];
  editable: boolean;
  /** RFQs take several backup documents; every other record takes one. */
  multiple: boolean;
  required: boolean;
  emptyHint: string;
  onChange: (attachments: RecordAttachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canAdd = editable && (multiple || attachments.length === 0);

  const handlePick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    onChange([...attachments, { source: 'local_file', file, fileName: file.name }]);
  };

  if (!editable && attachments.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={handlePick}
        aria-hidden="true"
        tabIndex={-1}
      />
      {attachments.map((attachment, index) => (
        <div
          key={`${recordAttachmentName(attachment)}-${index}`}
          className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-xs"
        >
          <FileFormatBadge fileName={recordAttachmentName(attachment)} className="size-5" />
          <span className="min-w-0 flex-1 truncate font-medium">
            {recordAttachmentName(attachment)}
            <span className="ml-1 font-normal text-muted-foreground">
              {attachment.source === 'email_attachment' ? '(from email)' : '(from your computer)'}
            </span>
          </span>
          {editable ? (
            <button
              type="button"
              className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Remove ${recordAttachmentName(attachment)}`}
              onClick={() => onChange(attachments.filter((_, i) => i !== index))}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
      {canAdd ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-background/60 px-2.5 py-1.5 text-xs">
          <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-muted-foreground">
            {attachments.length === 0 ? emptyHint : 'Add another file.'}
            {required && attachments.length === 0 ? ' Required.' : null}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="size-3.5" aria-hidden="true" />
            Attach file
          </Button>
        </div>
      ) : null}
    </div>
  );
}
