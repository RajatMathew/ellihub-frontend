import { Button } from '@/app/components/ui/button';
import { EmailComposeStatus } from '@/modules/email/components/compose/email-compose-actions';
import { EmailComposeAttachments } from '@/modules/email/components/compose/email-compose-attachments';
import { EmailComposeFields } from '@/modules/email/components/compose/email-compose-fields';
import { EmailComposeSurface } from '@/modules/email/components/compose/email-compose-surface';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';
import { prefersBodyFocus } from '@/modules/email/lib/email-compose-focus';
import { Send } from 'lucide-react';

interface EmailComposePaneProps {
  compose: EmailComposeController;
  mailboxAddress: string;
  accountId?: string;
}

/**
 * A new message or a reopened draft, in the full-page editor (elli-ui#807).
 * A shell only: every behaviour comes from the `useEmailCompose` controller,
 * every field from `EmailComposeFields`, and the chrome from
 * `EmailComposeSurface` — the same three a reply renders (elli-ui#1008).
 */
export function EmailComposePane({ compose, mailboxAddress, accountId }: EmailComposePaneProps) {
  const { fieldIds, form, isBusy, isPreparingAttachments } = compose;

  return (
    <EmailComposeSurface
      title={compose.title}
      subtitle={`From ${mailboxAddress}`}
      status={<EmailComposeStatus compose={compose} />}
      openToken={compose.openToken}
      autoFocus={{
        preferBody: prefersBodyFocus({ isEditingDraft: compose.isEditingDraft, to: form.to }),
        toFieldId: fieldIds.to,
        bodyFieldId: fieldIds.body,
      }}
      busy={isBusy}
      onCollapse={() => void compose.requestClose()}
      onClose={() => void compose.discard()}
      onEscape={() => void compose.requestClose()}
      formProps={compose.formProps}
    >
      <EmailComposeFields
        accountId={accountId}
        fieldIds={fieldIds}
        values={form}
        addressErrors={compose.addressErrors}
        showCc={compose.showCc}
        showBcc={compose.showBcc}
        onToggleCc={compose.setShowCc}
        onToggleBcc={compose.setShowBcc}
        onAddressChange={compose.updateAddressField}
        onSubjectChange={compose.setSubject}
        onBodyChange={compose.setBody}
        bodyLabel="Email body"
        // A draft opened from the cache can be on screen before its body has
        // arrived. Saying so beats an empty "Write your message…" that reads
        // like the draft lost its contents (elli-ui#925).
        bodyPlaceholder={
          compose.isDraftBodyPending ? 'Loading this draft’s message…' : 'Write your message...'
        }
        disabled={isBusy || compose.isDraftBodyPending}
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
        attachments={<EmailComposeAttachments compose={compose} />}
        onFilesSelected={(files) => {
          if (!isPreparingAttachments) compose.handleAttachmentSelection(files);
        }}
        drag={{
          isDragging: compose.isDragging,
          onDragEnter: compose.handleDragEnter,
          onDragLeave: compose.handleDragLeave,
          onDropCapture: compose.endDrag,
        }}
      />
    </EmailComposeSurface>
  );
}
