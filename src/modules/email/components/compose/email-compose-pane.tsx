import { EmailComposeStatus } from '@/modules/email/components/compose/email-compose-actions';
import { EmailComposeEditor } from '@/modules/email/components/compose/email-compose-editor';
import { useAttachmentReminder } from '@/modules/email/hooks/use-attachment-reminder';
import type { EmailComposeController } from '@/modules/email/hooks/use-email-compose';
import {
  composeAttachmentItems,
  type ComposeAttachmentItem,
} from '@/modules/email/lib/email-compose-attachment-items';
import { fileKey } from '@/modules/email/lib/email-compose-attachments';
import { prefersBodyFocus } from '@/modules/email/lib/email-compose-focus';

interface EmailComposePaneProps {
  compose: EmailComposeController;
  mailboxAddress: string;
  accountId?: string;
  onOpenAgent?: () => void;
}

/**
 * A new message or a reopened draft (elli-ui#807).
 *
 * An adapter and nothing else: it turns the `useEmailCompose` controller into
 * the props `EmailComposeEditor` takes, and the editor draws the screen. A
 * reply does the same from its own local state, which is what keeps the two
 * from drifting apart again (elli-ui#1008, elli-ui#1189).
 */
export function EmailComposePane({
  compose,
  mailboxAddress,
  accountId,
  onOpenAgent,
}: EmailComposePaneProps) {
  const { fieldIds, form, isBusy, isPreparingAttachments } = compose;
  const reminder = useAttachmentReminder();

  /**
   * Send, unless the message promises a file it does not carry — then ask
   * first, and send only on "Send anyway".
   */
  const formProps = {
    ...compose.formProps,
    onKeyDown: (event: React.KeyboardEvent<HTMLFormElement>) => {
      // The reminder's own buttons decide while it is up.
      if (!reminder.isOpen) compose.formProps.onKeyDown(event);
    },
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      reminder.guard(
        {
          bodyHtml: compose.form.body,
          attachmentCount: compose.attachments.length + compose.existingAttachments.length,
        },
        () => void compose.submit()
      );
    },
  };

  const removeAttachment = (item: ComposeAttachmentItem) => {
    if (item.kind === 'stored') {
      compose.setExistingAttachments((current) =>
        current.filter((attachment) => attachment.id !== item.id)
      );
      compose.setRemovedAttachmentIds((current) => [...current, item.id]);
      return;
    }
    // Keyed by `fileKey`, the same identity the tray drew the row with and the
    // duplicate check uses, so the row and the file cannot disagree.
    compose.removePendingAttachments(
      compose.attachments.filter((file) => fileKey(file) !== item.id)
    );
  };

  return (
    <>
      <EmailComposeEditor
        title={compose.title}
        mailboxAddress={mailboxAddress}
        status={<EmailComposeStatus compose={compose} />}
        openToken={compose.openToken}
        autoFocus={{
          preferBody: prefersBodyFocus({ isEditingDraft: compose.isEditingDraft, to: form.to }),
          toFieldId: fieldIds.to,
          bodyFieldId: fieldIds.body,
        }}
        busy={isBusy}
        onOpenAgent={onOpenAgent}
        onCollapse={() => void compose.requestClose()}
        onClose={() => void compose.discard()}
        onEscape={() => void compose.requestClose()}
        formProps={formProps}
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
        attachments={{
          inputId: compose.attachmentInputId,
          items: composeAttachmentItems({
            pending: compose.attachments,
            stored: compose.existingAttachments,
            saveStatus: compose.saveStatus,
            progress: compose.attachmentProgress,
            isPreparing: isPreparingAttachments,
          }),
          totalBytes: compose.totalAttachmentBytes,
          error: compose.attachmentError,
          isPreparing: isPreparingAttachments,
          onSelect: (files) => {
            if (!isPreparingAttachments) compose.handleAttachmentSelection(files);
          },
          onRemove: removeAttachment,
          onRemoveAll: () => {
            compose.removePendingAttachments([]);
            compose.setRemovedAttachmentIds((current) => [
              ...new Set([...current, ...compose.existingAttachments.map((item) => item.id)]),
            ]);
            compose.setExistingAttachments([]);
          },
        }}
        drag={{
          isDragging: compose.isDragging,
          onDragEnter: compose.handleDragEnter,
          onDragLeave: compose.handleDragLeave,
          onDropCapture: compose.endDrag,
        }}
        canSend={compose.canSend && !isBusy && !isPreparingAttachments}
        isSending={compose.isSubmitting || compose.isSending}
      />
      {reminder.dialog}
    </>
  );
}
