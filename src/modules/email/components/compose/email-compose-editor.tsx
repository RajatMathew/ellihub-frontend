import type { ComponentProps, ReactNode, Ref } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  EmailComposeAttachmentTray,
  type EmailComposeAttachmentTrayProps,
} from '@/modules/email/components/compose/email-compose-attachment-tray';
import {
  EmailComposeFields,
  type ComposeFieldIds,
  type ComposeFieldValues,
} from '@/modules/email/components/compose/email-compose-fields';
import {
  EmailComposeSurface,
  type ComposeAutoFocus,
} from '@/modules/email/components/compose/email-compose-surface';
import { EmailTemplatesMenu } from '@/modules/email/components/compose/email-templates-menu';
import type { ComposeDragState } from '@/modules/email/hooks/use-compose-drag';
import type { AddressField } from '@/modules/email/hooks/use-email-compose';
import { IS_APPLE_PLATFORM, sendShortcutLabel } from '@/modules/email/lib/email-send-shortcut';
import { Send } from 'lucide-react';

export interface EmailComposeEditorProps {
  // — Chrome ————————————————————————————————————————————————————————
  /** "New email", "Edit draft", "Reply", "Forward". */
  title: string;
  /** The mailbox this leaves from. Every editor shows it; they used not to. */
  mailboxAddress?: string;
  /** Draft-save read-out, or anything else that belongs beside the controls. */
  status?: ReactNode;
  openToken: number;
  autoFocus: ComposeAutoFocus;
  busy?: boolean;
  onOpenAgent?: () => void;
  agentTriggerRef?: Ref<HTMLButtonElement>;
  onCollapse?: () => void;
  collapseLabel?: string;
  onClose: () => void;
  closeLabel?: string;
  onEscape?: () => void;
  formProps?: ComponentProps<'form'>;

  // — Fields ————————————————————————————————————————————————————————
  /** Whose contacts the recipient fields suggest from. */
  accountId?: string;
  fieldIds: ComposeFieldIds;
  values: ComposeFieldValues;
  addressErrors?: Partial<Record<AddressField, string>>;
  showCc: boolean;
  showBcc: boolean;
  onToggleCc: (show: boolean) => void;
  onToggleBcc: (show: boolean) => void;
  onAddressChange: (field: AddressField, value: string) => void;
  /** Absent for a reply or a forward: the thread already fixed the subject. */
  onSubjectChange?: (value: string) => void;
  onBodyChange: (value: string) => void;
  bodyLabel: string;
  bodyPlaceholder: string;
  disabled?: boolean;
  /** Under the writing area, inside its scroller — a reply's quoted history. */
  belowContent?: ReactNode;

  // — Attachments ———————————————————————————————————————————————————
  attachments: EmailComposeAttachmentTrayProps;
  drag?: ComposeDragState;

  // — Footer ————————————————————————————————————————————————————————
  canSend: boolean;
  isSending: boolean;
}

/**
 * The full-page email editor. One component, every time a message is written:
 * a new message, a reopened draft, a reply, a forward.
 *
 * `EmailComposeSurface` (the chrome) and `EmailComposeFields` (the fields) were
 * already shared — but each caller still assembled them itself, and around that
 * assembly the two editors drifted until they no longer read as the same
 * screen: the reply had no attachment picker, no drop overlay, no mailbox in
 * its header and no Elliot button, and the only thing it had that the new
 * message did not was a hint about where it landed (elli-ui#1189).
 *
 * The assembly is what lives here now, so the only differences left are the
 * ones a caller states in props. Everything a surface legitimately varies —
 * what it is called, where it sends from, whether the subject can be typed,
 * what it does with its attachments — arrives that way; nothing is inferred
 * from which caller it is.
 */
export function EmailComposeEditor({
  title,
  mailboxAddress,
  status,
  openToken,
  autoFocus,
  busy = false,
  onOpenAgent,
  agentTriggerRef,
  onCollapse,
  collapseLabel,
  onClose,
  closeLabel,
  onEscape,
  formProps,
  accountId,
  fieldIds,
  values,
  addressErrors,
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
  belowContent,
  attachments,
  drag,
  canSend,
  isSending,
}: EmailComposeEditorProps) {
  return (
    <EmailComposeSurface
      title={title}
      subtitle={mailboxAddress ? `From ${mailboxAddress}` : undefined}
      status={status}
      openToken={openToken}
      autoFocus={autoFocus}
      busy={busy}
      onOpenAgent={onOpenAgent}
      agentTriggerRef={agentTriggerRef}
      onCollapse={onCollapse}
      collapseLabel={collapseLabel}
      onClose={onClose}
      closeLabel={closeLabel}
      onEscape={onEscape}
      formProps={formProps}
    >
      <EmailComposeFields
        accountId={accountId}
        fieldIds={fieldIds}
        values={values}
        addressErrors={addressErrors}
        showCc={showCc}
        showBcc={showBcc}
        onToggleCc={onToggleCc}
        onToggleBcc={onToggleBcc}
        onAddressChange={onAddressChange}
        onSubjectChange={onSubjectChange}
        onBodyChange={onBodyChange}
        bodyLabel={bodyLabel}
        bodyPlaceholder={bodyPlaceholder}
        disabled={disabled}
        belowContent={belowContent}
        attachments={<EmailComposeAttachmentTray {...attachments} />}
        // Dropping onto the editor attaches, the same as picking does.
        onFilesSelected={attachments.onSelect}
        drag={drag}
        toolbarTrailing={
          <>
            {/* Templates (elli-ui#668), beside Send. A template's subject only
                fills a subject still empty — a reply keeps the thread's. */}
            <EmailTemplatesMenu
              body={values.body}
              onBodyChange={onBodyChange}
              onSubjectFill={(subject) => {
                if (!values.subject.trim()) onSubjectChange?.(subject);
              }}
              disabled={disabled}
            />
            <EmailComposeSendButton canSend={canSend} isSending={isSending} />
          </>
        }
      />
    </EmailComposeSurface>
  );
}

/**
 * The one button that sends. Shared with the compact in-thread reply card,
 * which is the only other place a message can leave from.
 *
 * The send shortcut is named here but not drawn: printing it on the button
 * crowded a control that already carries a label and an icon, in a footer that
 * is the tightest row in the composer. It rides the tooltip and the accessible
 * name instead, so it is there on hover and for a screen reader — "Send,
 * Command + Enter" rather than "Send, command, return" — without putting a
 * third thing inside the button (elli-ui#1199).
 */
export function EmailComposeSendButton({
  canSend,
  isSending,
}: {
  canSend: boolean;
  isSending: boolean;
}) {
  const action = isSending ? 'Sending' : 'Send';
  const shortcut = sendShortcutLabel(IS_APPLE_PLATFORM);

  return (
    <Button
      type="submit"
      size="sm"
      className="gap-2"
      disabled={!canSend || isSending}
      aria-busy={isSending}
      aria-keyshortcuts={IS_APPLE_PLATFORM ? 'Meta+Enter' : 'Control+Enter'}
      aria-label={`${action}, ${shortcut}`}
      title={`${action} (${shortcut})`}
    >
      {action}
      <Send aria-hidden="true" className="size-3.5" />
    </Button>
  );
}
