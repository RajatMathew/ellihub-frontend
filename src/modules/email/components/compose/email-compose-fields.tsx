import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import { EmailComposeAddressField } from '@/modules/email/components/compose/email-compose-address-field';
import { EmailComposeAttachments } from '@/modules/email/components/compose/email-compose-attachments';
import { EmailRichTextEditor } from '@/modules/email/components/email-rich-text-editor';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';
import { Send } from 'lucide-react';

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
        'relative flex min-h-0 flex-1 flex-col',
        isDragging && 'bg-primary/5 ring-2 ring-inset ring-primary/40',
        className
      )}
      onDragEnter={compose.handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={compose.handleDragLeave}
      // Capture phase: the body editor handles its own drop and stops the event
      // from bubbling, so a bubble-phase reset here would never run and the
      // overlay would stay up for good (elli-ui#910).
      onDropCapture={compose.endDrag}
      onDrop={(event) => {
        event.preventDefault();
        // Dropping during an upload queues behind it instead of being ignored:
        // the user no longer has to wait out a 25 MB round trip to add the next
        // file.
        compose.handleAttachmentSelection(event.dataTransfer.files);
      }}
    >
      {isDragging && (
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

      <div className="flex min-h-0 flex-1 flex-col">
        <EmailRichTextEditor
          className="min-h-0 flex-1 gap-0"
          id={fieldIds.body}
          value={form.body}
          label="Email body"
          // A draft opened from the cache can be on screen before its body has
          // arrived. Saying so beats an empty "Write your message…" that reads
          // like the draft lost its contents (elli-ui#925).
          placeholder={
            compose.isDraftBodyPending ? 'Loading this draft’s message…' : 'Write your message...'
          }
          disabled={isBusy || compose.isDraftBodyPending}
          editorClassName="min-h-full px-5 py-4"
          toolbarClassName="border-t border-mail-pane-line bg-mail-pane px-2.5 py-2"
          // One footer: how the message is formatted, and the one button that
          // sends it. Nothing else competes for the corner.
          toolbarTrailing={
            <Button
              type="submit"
              size="sm"
              className="gap-2"
              disabled={!compose.canSend || isBusy || isPreparingAttachments}
              aria-busy={compose.isSubmitting || compose.isSending}
            >
              {compose.isSubmitting || compose.isSending ? 'Sending' : 'Send'}
              <Send aria-hidden="true" className="size-3.5" />
            </Button>
          }
          onChange={compose.setBody}
          onFilesSelected={(files) => {
            if (!isPreparingAttachments) compose.handleAttachmentSelection(files);
          }}
        />
      </div>

      <div className="shrink-0 border-t border-mail-pane-line">
        <EmailComposeAttachments compose={compose} />
      </div>
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
