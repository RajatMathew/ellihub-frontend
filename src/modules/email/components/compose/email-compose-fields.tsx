import type { DragEvent, ReactNode } from 'react';

import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import { EmailComposeAddressField } from '@/modules/email/components/compose/email-compose-address-field';
import { EmailRichTextEditor } from '@/modules/email/components/email-rich-text-editor';
import type { AddressField } from '@/modules/email/hooks/use-email-compose';

export interface ComposeFieldIds {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

export interface ComposeFieldValues {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

export interface EmailComposeFieldsProps {
  accountId?: string;
  fieldIds: ComposeFieldIds;
  values: ComposeFieldValues;
  addressErrors?: Partial<Record<AddressField, string>>;
  showCc: boolean;
  showBcc: boolean;
  onToggleCc: (show: boolean) => void;
  onToggleBcc: (show: boolean) => void;
  onAddressChange: (field: AddressField, value: string) => void;
  /** Absent for a reply or forward: the thread already fixed the subject. */
  onSubjectChange?: (value: string) => void;
  onBodyChange: (value: string) => void;
  bodyLabel: string;
  bodyPlaceholder: string;
  disabled?: boolean;
  /** The footer row's trailing end — the hint and the one button that sends. */
  toolbarTrailing: ReactNode;
  /** Rendered under the editor by the surfaces that accept attachments. */
  attachments?: ReactNode;
  onFilesSelected?: (files: FileList) => void;
  drag?: {
    isDragging: boolean;
    onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
    onDropCapture: () => void;
  };
  className?: string;
}

/**
 * The editor itself: recipients, subject, body and whatever the surface hangs
 * off the footer. It knows nothing about the surface it is mounted in — a new
 * message, a draft, a reply and a forward all render exactly this, which is
 * what keeps them from drifting apart (elli-ui#1008).
 */
export function EmailComposeFields({
  accountId,
  fieldIds,
  values,
  addressErrors = {},
  showCc,
  showBcc,
  onToggleCc,
  onToggleBcc,
  onAddressChange,
  onSubjectChange,
  onBodyChange,
  bodyLabel,
  bodyPlaceholder,
  disabled = false,
  toolbarTrailing,
  attachments,
  onFilesSelected,
  drag,
  className,
}: EmailComposeFieldsProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col',
        drag?.isDragging && 'bg-primary/5 ring-2 ring-inset ring-primary/40',
        className
      )}
      onDragEnter={drag?.onDragEnter}
      onDragOver={drag ? (event) => event.preventDefault() : undefined}
      onDragLeave={drag?.onDragLeave}
      // Capture phase: the body editor handles its own drop and stops the event
      // from bubbling, so a bubble-phase reset here would never run and the
      // overlay would stay up for good (elli-ui#910).
      onDropCapture={drag?.onDropCapture}
      onDrop={
        drag
          ? (event) => {
              event.preventDefault();
              // Dropping during an upload queues behind it instead of being
              // ignored: no waiting out a 25 MB round trip to add the next file.
              onFilesSelected?.(event.dataTransfer.files);
            }
          : undefined
      }
    >
      {drag?.isDragging && (
        <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/85 text-sm font-medium text-primary">
          Drop files to attach
        </div>
      )}
      {/* Recipients and subject stay put; only the body scrolls. */}
      <div className="shrink-0 divide-y divide-mail-hair border-b border-mail-pane-line">
        <EmailComposeAddressField
          accountId={accountId}
          id={fieldIds.to}
          label="To"
          value={values.to}
          required
          placeholder="Add recipients"
          error={addressErrors.to}
          onChange={(to) => onAddressChange('to', to)}
        >
          {!showCc && <ComposeFieldToggle label="Cc" onClick={() => onToggleCc(true)} />}
          {!showBcc && <ComposeFieldToggle label="Bcc" onClick={() => onToggleBcc(true)} />}
        </EmailComposeAddressField>
        {showCc && (
          <EmailComposeAddressField
            accountId={accountId}
            id={fieldIds.cc}
            label="Cc"
            value={values.cc}
            placeholder="Add Cc recipients"
            error={addressErrors.cc}
            onChange={(cc) => onAddressChange('cc', cc)}
            onRemove={() => {
              onToggleCc(false);
              onAddressChange('cc', '');
            }}
          />
        )}
        {showBcc && (
          <EmailComposeAddressField
            accountId={accountId}
            id={fieldIds.bcc}
            label="Bcc"
            value={values.bcc}
            placeholder="Add Bcc recipients"
            error={addressErrors.bcc}
            onChange={(bcc) => onAddressChange('bcc', bcc)}
            onRemove={() => {
              onToggleBcc(false);
              onAddressChange('bcc', '');
            }}
          />
        )}
        <ComposeSubjectRow
          id={fieldIds.subject}
          value={values.subject}
          onChange={onSubjectChange}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <EmailRichTextEditor
          className="min-h-0 flex-1 gap-0"
          id={fieldIds.body}
          value={values.body}
          label={bodyLabel}
          placeholder={bodyPlaceholder}
          disabled={disabled}
          contentClassName="px-5 py-4"
          editorClassName="min-h-full"
          toolbarClassName="border-t border-mail-pane-line bg-mail-pane px-2.5 py-2"
          // One footer: how the message is formatted, and the one button that
          // sends it. Nothing else competes for the corner.
          toolbarTrailing={toolbarTrailing}
          onChange={onBodyChange}
          onFilesSelected={onFilesSelected}
        />
      </div>

      {attachments && <div className="shrink-0 border-t border-mail-pane-line">{attachments}</div>}
    </div>
  );
}

/**
 * A new message types its own subject; a reply inherits the thread's and shows
 * it as text, because changing it there would fork the conversation. It is not
 * a disabled input: a control nobody can use is noise in a row of fields that
 * all take typing.
 */
function ComposeSubjectRow({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  if (!onChange) {
    return (
      <div className="flex min-w-0 items-center gap-3 px-5 py-2.5">
        <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Subject</span>
        <p className="min-w-0 truncate text-sm text-foreground">{value}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      <label htmlFor={id} className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
        Subject
        <span className="text-destructive"> *</span>
      </label>
      <Input
        id={id}
        value={value}
        required
        placeholder="Add a subject"
        className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ComposeFieldToggle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="cursor-pointer rounded-sm px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
