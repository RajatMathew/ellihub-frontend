import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { EmailComposeFields } from '@/modules/email/components/compose/email-compose-fields';
import { EmailComposeSurface } from '@/modules/email/components/compose/email-compose-surface';
import { EmailRichTextEditor } from '@/modules/email/components/email-rich-text-editor';
import type { EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { getEmailAddressListError } from '@/modules/email/lib/email-addresses';
import { COMPOSE_LAYER_SELECTOR } from '@/modules/email/lib/email-compose-layer';
import {
  getReplyComposeSeed,
  type EmailComposerMode,
} from '@/modules/email/lib/email-reply-compose';
import { isEmptyEmailHtml } from '@/modules/email/lib/email-rich-text';
import { Maximize2, Paperclip, Send, X } from 'lucide-react';

export type EmailReplyDraft = {
  /** Rich-text HTML, sent with `bodyType: 'html'`. */
  body: string;
  to: string;
  cc: string;
  bcc: string;
};

export type { EmailComposerMode };

interface EmailReplyComposerProps {
  message: EmailThreadMessage;
  mode?: EmailComposerMode;
  /** Shown in the full-page subject row; the thread's own subject. */
  subject?: string;
  accountId?: string;
  isSending?: boolean;
  onSend: (draft: EmailReplyDraft) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Replying: a compact card in the thread, or the full-page editor.
 *
 * Full page is not a second composer any more. It is `EmailComposeSurface` and
 * `EmailComposeFields` — the very components a new message renders — so a reply
 * gets the same recipient chips, the same Cc/Bcc, the same footer, and lives in
 * the same layer over the workspace instead of inside the thread's scroller,
 * which is what made it scroll away under the toolbar (elli-ui#1008,
 * elli-ui#1009).
 */
export function EmailReplyComposer({
  message,
  mode = 'reply',
  subject,
  accountId,
  isSending = false,
  onSend,
  onCancel,
}: EmailReplyComposerProps) {
  const seed = getReplyComposeSeed({ mode, senderEmail: message.senderEmail });
  const isForward = mode === 'forward';
  const [body, setBody] = useState('');
  const [to, setTo] = useState(seed.to);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isFullPage, setIsFullPage] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Partial<Record<'to' | 'cc' | 'bcc', string>>>(
    {}
  );
  const toId = useId();
  const ccId = useId();
  const bccId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  /**
   * The workspace layer the full-page editor is portalled into — the same slot
   * the new-message editor fills. Read off the DOM before the switch, so the
   * collapsed card can unmount without taking the anchor with it. Null means no
   * layer was found (the composer is mounted outside the mailbox), and the
   * editor then renders in place.
   */
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [openToken, setOpenToken] = useState(0);

  useEffect(() => {
    // A forward needs a recipient first; a reply already has one.
    document.getElementById(seed.preferBodyFocus ? bodyId : toId)?.focus();
  }, [bodyId, seed.preferBodyFocus, toId]);

  const canSend = (isForward || !isEmptyEmailHtml(body)) && to.trim().length > 0 && !isSending;
  const recipientLabel = isForward ? to.trim() || 'someone' : message.senderName || to;

  const submit = async () => {
    const nextErrors = {
      to: getEmailAddressListError(to, 'To', true) ?? undefined,
      cc: getEmailAddressListError(cc, 'Cc') ?? undefined,
      bcc: getEmailAddressListError(bcc, 'Bcc') ?? undefined,
    };
    setAddressErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    if (!canSend) return;
    await onSend({ body, to, cc, bcc });
    setBody('');
  };

  const handleAddressChange = (field: 'to' | 'cc' | 'bcc', value: string) => {
    if (field === 'to') setTo(value);
    if (field === 'cc') setCc(value);
    if (field === 'bcc') setBcc(value);
    setAddressErrors((current) => ({ ...current, [field]: undefined }));
  };

  const openFullPage = () => {
    setLayer(formRef.current?.closest<HTMLElement>(COMPOSE_LAYER_SELECTOR) ?? null);
    setOpenToken((token) => token + 1);
    setIsFullPage(true);
  };

  const sendButton = (
    <Button type="submit" size="sm" className="gap-2" disabled={!canSend} aria-busy={isSending}>
      {isSending ? 'Sending' : 'Send'}
      <Send aria-hidden="true" className="size-3.5" />
    </Button>
  );

  const keyboardSend = (event: React.KeyboardEvent<HTMLFormElement>) => {
    // Cmd/Ctrl + Enter sends, matching the new-message editor.
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    if (canSend) event.currentTarget.requestSubmit();
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  if (isFullPage) {
    const editor = (
      <EmailComposeSurface
        title={seed.title}
        openToken={openToken}
        autoFocus={{ preferBody: seed.preferBodyFocus, toFieldId: toId, bodyFieldId: bodyId }}
        busy={isSending}
        // Collapsing keeps the draft and drops back into the thread; the ✕ is
        // still the only way to throw it away.
        onCollapse={() => setIsFullPage(false)}
        onEscape={() => setIsFullPage(false)}
        onClose={onCancel}
        formProps={{ onKeyDown: keyboardSend, onSubmit }}
      >
        <EmailComposeFields
          accountId={accountId}
          fieldIds={{ to: toId, cc: ccId, bcc: bccId, subject: subjectId, body: bodyId }}
          values={{ to, cc, bcc, subject: subject ?? '', body }}
          addressErrors={addressErrors}
          showCc={showCc}
          showBcc={showBcc}
          onToggleCc={setShowCc}
          onToggleBcc={setShowBcc}
          onAddressChange={handleAddressChange}
          onBodyChange={setBody}
          bodyLabel={seed.bodyLabel}
          bodyPlaceholder="Write your message..."
          disabled={isSending}
          toolbarTrailing={
            <>
              <span className="hidden min-w-0 shrink truncate text-[12.5px] text-mail-muted lg:inline">
                Lands at the end of the thread
              </span>
              {sendButton}
            </>
          }
        />
      </EmailComposeSurface>
    );
    return layer ? createPortal(editor, layer) : editor;
  }

  return (
    <form
      ref={formRef}
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-mail-pane-line bg-mail-card"
      aria-label={
        isForward ? `Forward message from ${message.senderName}` : `Reply to ${recipientLabel}`
      }
      onKeyDown={keyboardSend}
      onSubmit={onSubmit}
    >
      <header className="flex min-w-0 shrink-0 items-center gap-2.5 border-b border-mail-pane-line px-4 py-2.5">
        <SenderAvatar
          name={recipientLabel}
          email={isForward ? undefined : message.senderEmail}
          accountId={accountId}
          className="size-6 text-[10px]"
        />
        <p className="min-w-0 truncate text-[13px] text-mail-mid">
          {isForward ? 'Forward to' : 'To'}{' '}
          <span className="font-semibold text-mail-ink">{recipientLabel}</span>
        </p>

        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <ComposerChromeButton label="Full screen" icon={Maximize2} onClick={openFullPage} />
          <ComposerChromeButton label="Discard" icon={X} iconOnly onClick={onCancel} />
        </div>
      </header>

      <EmailRichTextEditor
        className="min-h-0 gap-0"
        id={bodyId}
        value={body}
        label={seed.bodyLabel}
        placeholder={isForward ? 'Add a message (optional)...' : 'Write your reply...'}
        disabled={isSending}
        contentClassName="px-4 py-3"
        editorClassName="min-h-32"
        toolbarClassName="border-t border-mail-pane-line bg-mail-pane px-2.5 py-2"
        toolbarTrailing={
          <>
            <button
              type="button"
              className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] text-mail-muted hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
              disabled={isSending}
              aria-label="Attach files"
            >
              <Paperclip aria-hidden="true" className="size-3.5" />
            </button>
            <span className="hidden min-w-0 shrink truncate text-[12.5px] text-mail-muted lg:inline">
              Your reply lands at the end of the thread
            </span>
            {sendButton}
          </>
        }
        onChange={setBody}
      />
    </form>
  );
}

function ComposerChromeButton({
  label,
  icon: Icon,
  iconOnly = false,
  onClick,
}: {
  label: string;
  icon: typeof Send;
  iconOnly?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] text-mail-mid',
        'hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100'
      )}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
      {!iconOnly && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
