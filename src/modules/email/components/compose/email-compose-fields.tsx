import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import { EmailComposeAddressField } from '@/modules/email/components/compose/email-compose-address-field';
import { EmailComposeAttachments } from '@/modules/email/components/compose/email-compose-attachments';
import { EmailRichTextEditor } from '@/modules/email/components/email-rich-text-editor';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';

/**
 * The composer itself: recipients, subject, body and attachments, plus the
 * drag-and-drop target that wraps them. It knows nothing about the surface it
 * is mounted in — the modal and the inline reading-pane composer both render
 * exactly this, driven by the same controller.
 */
export function EmailComposeFields({
  compose,
  accountId,
  className,
}: {
  compose: EmailComposeController;
  accountId?: string;
  className?: string;
}) {
  const { fieldIds, form, addressErrors, isDragging, isBusy, isPreparingAttachments } = compose;

  return (
    <div
      className={cn(
        'relative min-h-0 flex-1 overflow-auto',
        isDragging && 'bg-primary/5 ring-2 ring-inset ring-primary/40',
        className
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        compose.setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) compose.setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        compose.setIsDragging(false);
        if (!isPreparingAttachments) {
          compose.handleAttachmentSelection(event.dataTransfer.files);
        }
      }}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/85 text-sm font-medium text-primary">
          Drop files to attach
        </div>
      )}
      <div className="divide-y divide-border">
        <EmailComposeAddressField
          accountId={accountId}
          id={fieldIds.to}
          label="To"
          value={form.to}
          required
          placeholder="Add recipients"
          error={addressErrors.to}
          onChange={(to) => compose.updateAddressField('to', to)}
        >
          {!compose.showCc && (
            <ComposeFieldToggle label="Cc" onClick={() => compose.setShowCc(true)} />
          )}
          {!compose.showBcc && (
            <ComposeFieldToggle label="Bcc" onClick={() => compose.setShowBcc(true)} />
          )}
        </EmailComposeAddressField>
        {compose.showCc && (
          <EmailComposeAddressField
            accountId={accountId}
            id={fieldIds.cc}
            label="Cc"
            value={form.cc}
            placeholder="Add Cc recipients"
            error={addressErrors.cc}
            onChange={(cc) => compose.updateAddressField('cc', cc)}
            onRemove={() => {
              compose.setShowCc(false);
              compose.updateAddressField('cc', '');
            }}
          />
        )}
        {compose.showBcc && (
          <EmailComposeAddressField
            accountId={accountId}
            id={fieldIds.bcc}
            label="Bcc"
            value={form.bcc}
            placeholder="Add Bcc recipients"
            error={addressErrors.bcc}
            onChange={(bcc) => compose.updateAddressField('bcc', bcc)}
            onRemove={() => {
              compose.setShowBcc(false);
              compose.updateAddressField('bcc', '');
            }}
          />
        )}
        <div className="flex items-center gap-3 px-5 py-2.5">
          <label
            htmlFor={fieldIds.subject}
            className="w-16 shrink-0 text-xs font-medium text-muted-foreground"
          >
            Subject
            <span className="text-destructive"> *</span>
          </label>
          <Input
            id={fieldIds.subject}
            value={form.subject}
            required
            placeholder="Add a subject"
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onChange={(event) => compose.setSubject(event.target.value)}
          />
        </div>
      </div>

      <div className="px-5 py-4">
        <EmailRichTextEditor
          id={fieldIds.body}
          value={form.body}
          label="Email body"
          placeholder="Write your message..."
          disabled={isBusy}
          onChange={compose.setBody}
          onFilesSelected={(files) => {
            if (!isPreparingAttachments) compose.handleAttachmentSelection(files);
          }}
        />
      </div>

      <EmailComposeAttachments compose={compose} />
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
