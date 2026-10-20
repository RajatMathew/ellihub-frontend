import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Switch } from '@/app/components/ui/switch';
import { cn } from '@/app/lib/utils';
import { EmailComposeAddressField } from '@/modules/email/components/compose/email-compose-address-field';
import { EmailComposeAttachmentTray } from '@/modules/email/components/compose/email-compose-attachment-tray';
import {
  EmailComposeEditor,
  EmailComposeSendButton,
} from '@/modules/email/components/compose/email-compose-editor';
import { EmailSignatureMenu } from '@/modules/email/components/compose/email-signature-menu';
import { EmailTemplatesMenu } from '@/modules/email/components/compose/email-templates-menu';
import { EmailRichTextEditor } from '@/modules/email/components/email-rich-text-editor';
import type { EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { useEmailSignaturesQuery } from '@/modules/email/hooks/email.hooks';
import { useAttachmentReminder } from '@/modules/email/hooks/use-attachment-reminder';
import { useComposeDrag } from '@/modules/email/hooks/use-compose-drag';
import { getEmailAddressListError } from '@/modules/email/lib/email-addresses';
import {
  composeAttachmentBytes,
  composeAttachmentItems,
  type ComposeAttachmentItem,
} from '@/modules/email/lib/email-compose-attachment-items';
import { fileKey, getNewAttachments } from '@/modules/email/lib/email-compose-attachments';
import { COMPOSE_LAYER_SELECTOR } from '@/modules/email/lib/email-compose-layer';
import {
  getReplyComposeSeed,
  getReplyHeaderRecipient,
  type EmailComposerMode,
} from '@/modules/email/lib/email-reply-compose';
import { replyDraftHasContent } from '@/modules/email/lib/email-reply-draft-content';
import { buildReplyBodyForSend, buildReplyQuote } from '@/modules/email/lib/email-reply-quote';
import { isEmptyEmailHtml } from '@/modules/email/lib/email-rich-text';
import { isSendShortcut } from '@/modules/email/lib/email-send-shortcut';
import {
  getSignatureSeed,
  isEmptyEmailBody,
  withoutEmailSignature,
} from '@/modules/email/lib/email-signature';
import { Info, Maximize2, Paperclip, X, type LucideIcon } from 'lucide-react';

export type EmailReplyDraft = {
  /**
   * Rich-text HTML, sent with `bodyType: 'html'`. Already carries the quoted
   * original when the reader left `Include when sending` on, so the caller
   * sends this verbatim — see `email-reply-quote.ts`.
   */
  body: string;
  /**
   * True when this composer built the quoted history itself, so the provider
   * must not add its own (elli-ui#1176).
   *
   * False on a forward: there the provider's own forward action is what
   * attaches the original and its attachments, and claiming otherwise would
   * send a forward with nothing forwarded.
   */
  quoteHandledByClient: boolean;
  to: string;
  cc: string;
  bcc: string;
  /**
   * Files picked in the composer, still as `File` — base64 encoding happens at
   * the send call, not here, so a draft the user never sends never pays for it.
   */
  attachments: File[];
};

export type { EmailComposerMode };

interface EmailReplyComposerProps {
  message: EmailThreadMessage;
  mode?: EmailComposerMode;
  /** Shown in the full-page subject row; the thread's own subject. */
  subject?: string;
  accountId?: string;
  /** The mailbox this reply leaves from, named in the full-page header. */
  mailboxAddress?: string;
  isSending?: boolean;
  onSend: (draft: EmailReplyDraft) => Promise<void> | void;
  onCancel: () => void;
  /** Opens Elliot beside the draft, the way the new-message editor does. */
  onOpenAgent?: () => void;
  /**
   * Told whenever the composer enters or leaves the full-page editor.
   *
   * The reading pane needs it to take the feedback bubble down: that bubble is
   * `fixed bottom-4 right-4`, so over a full-page editor it sits on top of the
   * Send button. The new-message editor has always hidden it; a reply that went
   * full page did not, which is half of elli-ui#1189.
   */
  onFullPageChange?: (isFullPage: boolean) => void;
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
  mailboxAddress,
  isSending = false,
  onSend,
  onCancel,
  onOpenAgent,
  onFullPageChange,
}: EmailReplyComposerProps) {
  const seed = getReplyComposeSeed({ mode, senderEmail: message.senderEmail });
  const isForward = mode === 'forward';
  const signaturesQuery = useEmailSignaturesQuery(accountId);
  // Opens with the mailbox's reply signature under an empty line.
  const [body, setBody] = useState(() => getSignatureSeed(signaturesQuery.data, 'reply'));
  /**
   * Signatures still loading when the composer opened: the signature goes in
   * when they land, unless something has been typed by then. Adjusted during
   * render rather than in an effect, so the editor never paints without it.
   */
  const [signatureSettled, setSignatureSettled] = useState(() => Boolean(signaturesQuery.data));
  if (!signatureSettled && signaturesQuery.data) {
    setSignatureSettled(true);
    if (isEmptyEmailHtml(body)) setBody(getSignatureSeed(signaturesQuery.data, 'reply'));
  }
  const [to, setTo] = useState(seed.to);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isFullPage, setIsFullPage] = useState(false);
  /**
   * Attachments on a reply (elli-ui#1018). The paperclip in this composer was
   * decoration — a button with no handler — while elli-core has accepted
   * `attachments` on both the reply and the forward endpoint all along
   * (`ReplyMessageSchema` extends `SendMessageSchema`). Only the client half
   * was missing, so this is a picker and a tray, not a new transport.
   */
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  /** The drop overlay, from the hook the new-message editor's controller uses. */
  const drag = useComposeDrag();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const quoteId = useId();
  const includeQuoteId = useId();
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [openToken, setOpenToken] = useState(0);
  /**
   * Whether the quote is shown in the composer AND sent — one switch, not two.
   * A reader who does not want the history in the message does not want to
   * look at it here either, so "show it" and "send it" collapsed into the one
   * question a reply actually asks: does the thread go out with this message?
   * On by default, because a reply that drops the thread is the surprising
   * outcome (elli-ui#1176).
   */
  const [includeQuote, setIncludeQuote] = useState(true);

  /**
   * A forward already carries the original through the provider's own forward
   * action, so quoting it here would send it twice.
   */
  const quote = isForward
    ? ''
    : buildReplyQuote({
        senderName: message.senderName,
        senderEmail: message.senderEmail,
        sentAt: message.sentAt,
        to: message.to,
        cc: message.cc,
        subject,
        body: message.body,
      });

  useEffect(() => {
    // A forward needs a recipient first; a reply already has one.
    document.getElementById(seed.preferBodyFocus ? bodyId : toId)?.focus();
  }, [bodyId, seed.preferBodyFocus, toId]);

  /**
   * Sending or discarding unmounts this composer while it is still full page,
   * and nothing else would then tell the pane the editor had gone — the
   * feedback bubble would stay hidden for the rest of the session. Read through
   * a ref so the cleanup does not re-run on every keystroke.
   */
  const fullPageChangeRef = useRef(onFullPageChange);
  useEffect(() => {
    fullPageChangeRef.current = onFullPageChange;
  });
  useEffect(() => () => fullPageChangeRef.current?.(false), []);

  /**
   * The quoted original and the one decision about it: whether the thread
   * rides along with this reply. One node, rendered by both surfaces. The
   * full-page editor missed it when this lived inline in the compact branch,
   * which left the switch invisible there while still deciding what went out.
   *
   * Null when there is nothing to quote: a reply to a message with no body
   * would otherwise show a control row over an empty rule.
   */
  const quotedTextControls = quote
    ? quote && (
        <div>
          <div className="my-5 inline-flex min-w-0 items-center gap-1.5 rounded-full bg-surface-hover/70 p-1.5 pr-3">
            {/* `sm`, not the default `md`: at 24px the control was twice
                the height of the 12.5px label beside it. */}
            <Switch
              id={includeQuoteId}
              size="sm"
              checked={includeQuote}
              disabled={isSending}
              onCheckedChange={setIncludeQuote}
            />
            <label
              htmlFor={includeQuoteId}
              className="cursor-pointer truncate text-[12.5px] font-semibold text-foreground"
            >
              Include quoted text
            </label>
          </div>

          {/*
              `hidden` rather than unmounting: the quote is static, and keeping it
              in the tree means the toggle is instant. `aria-hidden` follows it so
              a screen reader does not read a quote that is not going out.
            */}
          <div
            id={quoteId}
            hidden={!includeQuote}
            aria-hidden={!includeQuote}
            className="mt-2 border-l-2 border-mail-line pl-3 text-[12.5px] leading-relaxed text-mail-mid"
            dangerouslySetInnerHTML={{ __html: quote }}
          />
        </div>
      )
    : null;

  // The signature alone is not a reply — `isEmptyEmailBody` ignores it,
  // where `isEmptyEmailHtml` would count it as something written.
  const canSend = (isForward || !isEmptyEmailBody(body)) && to.trim().length > 0 && !isSending;
  const { name: recipientLabel, address: recipientAddress } = getReplyHeaderRecipient({
    mode,
    senderName: message.senderName,
    to,
  });
  const showIncludedHint = Boolean(quote) || withoutEmailSignature(body) !== body;

  const submit = async () => {
    const nextErrors = {
      to: getEmailAddressListError(to, 'To', true) ?? undefined,
      cc: getEmailAddressListError(cc, 'Cc') ?? undefined,
      bcc: getEmailAddressListError(bcc, 'Bcc') ?? undefined,
    };
    setAddressErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    if (!canSend) return;
    await onSend({
      body: buildReplyBodyForSend({ typed: body, quote, includeQuote }),
      // A forward leaves the original to the provider; a reply does not.
      quoteHandledByClient: !isForward,
      to,
      cc,
      bcc,
      attachments: attachedFiles,
    });
    setBody('');
    setAttachedFiles([]);
    setAttachmentError(null);
  };

  /**
   * The same budget the new-message composer enforces, from the same helper:
   * providers cap the whole message at ~25 MB, so the check has to be across
   * every file together rather than per file.
   */
  const addFiles = (files: FileList | null) => {
    const accepted = getNewAttachments(files, attachedFiles, 0, setAttachmentError);
    if (accepted.length) setAttachedFiles((current) => [...current, ...accepted]);
  };

  /**
   * Removed by `fileKey`, the identity the tray drew the row with and the
   * duplicate check already uses, so a row and the file it stands for cannot
   * disagree about which file it is.
   */
  const removeFileByKey = (key: string) => {
    setAttachedFiles((current) => current.filter((file) => fileKey(file) !== key));
    setAttachmentError(null);
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
    onFullPageChange?.(true);
  };

  /** Back to the compact card, with the draft intact. */
  const closeFullPage = () => {
    setIsFullPage(false);
    onFullPageChange?.(false);
  };

  /**
   * One tray, and the same one the new-message editor draws (elli-ui#1189).
   * It is handed to both surfaces, so switching between them cannot show two
   * different sets of attachments — and a reply now says how much of the 25 MB
   * budget it has spent, which it never used to.
   *
   * The compact card drops the picker row: its own toolbar already carries a
   * paperclip, and two buttons for one job is worse than none.
   */
  const attachmentItems = composeAttachmentItems({ pending: attachedFiles });
  const attachmentTrayProps = {
    items: attachmentItems,
    totalBytes: composeAttachmentBytes(attachmentItems),
    error: attachmentError,
    disabled: isSending,
    onSelect: addFiles,
    onRemove: (item: ComposeAttachmentItem) => {
      removeFileByKey(item.id);
    },
  };

  const sendButton = <EmailComposeSendButton canSend={canSend} isSending={isSending} />;

  /**
   * Escape closes the composer (elli-ui#1092) — it was the one way out that did
   * nothing, so a reply opened by accident had to be dismissed with the mouse.
   * `email-compose-address-field` has assumed this all along: it stops the
   * event so dismissing its suggestion list does not also close the card.
   *
   * With a draft in it, Escape asks first. The ✕ beside it is labelled Discard
   * and still throws the draft away on the spot: a click on a discard button is
   * intent, a key pressed while typing is not.
   */
  const hasDraft = replyDraftHasContent({
    body,
    attachmentCount: attachedFiles.length,
    to,
    cc,
    bcc,
    seedTo: seed.to,
  });
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  // "Please find attached…" with nothing attached: asked before it goes. A
  // forward carries the original's files, so only a reply is asked.
  const reminder = useAttachmentReminder();
  const requestClose = () => {
    if (hasDraft) {
      setDiscardConfirmOpen(true);
      return;
    }
    onCancel();
  };

  const keyboardEscape = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    // Mid-composition in an IME, Escape cancels the candidate, not the reply.
    if (event.nativeEvent.isComposing) return;
    // The confirm is a layer of its own: its Escape dismisses it, and Radix
    // portals the content into this component's React tree, so the event
    // reaches here too.
    if (discardConfirmOpen || reminder.isOpen) return;

    event.preventDefault();
    event.stopPropagation();
    requestClose();
  };

  const keyboardSend = (event: React.KeyboardEvent<HTMLFormElement>) => {
    // Cmd/Ctrl + Enter sends, from the same predicate the new-message editor
    // uses — the two used to spell it out separately.
    if (!isSendShortcut(event)) return;
    event.preventDefault();
    // The reminder's own buttons decide while it is up.
    if (canSend && !reminder.isOpen) event.currentTarget.requestSubmit();
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isForward) return void submit();
    reminder.guard({ bodyHtml: body, attachmentCount: attachedFiles.length }, () => void submit());
  };

  const discardDialog = (
    <ConfirmDialog
      open={discardConfirmOpen}
      onOpenChange={(open) => {
        setDiscardConfirmOpen(open);
        // Radix hands focus back to whatever opened the dialog; a key press
        // has no trigger element, so focus landed on `<body>` and the next
        // Escape went nowhere — the reader pressed it twice and the composer
        // sat there. Put the caret back where they were typing.
        if (!open) {
          requestAnimationFrame(() => {
            const form = formRef.current;
            const editor = form?.querySelector<HTMLElement>('[contenteditable="true"]');
            (editor ?? form)?.focus();
          });
        }
      }}
      title={isForward ? 'Discard this forward?' : 'Discard this reply?'}
      description="What you have written here will not be kept."
      confirmLabel="Discard"
      variant="destructive"
      onConfirm={onCancel}
    />
  );

  if (isFullPage) {
    const editor = (
      <EmailComposeEditor
        title={seed.title}
        mailboxAddress={mailboxAddress}
        openToken={openToken}
        autoFocus={{ preferBody: seed.preferBodyFocus, toFieldId: toId, bodyFieldId: bodyId }}
        busy={isSending}
        onOpenAgent={onOpenAgent}
        // Collapsing keeps the draft and drops back into the thread; the ✕ is
        // still the only way to throw it away.
        onCollapse={closeFullPage}
        onEscape={closeFullPage}
        onClose={onCancel}
        formProps={{ onKeyDown: keyboardSend, onSubmit }}
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
        belowContent={quotedTextControls}
        // The same picker, the same tray and the same drop overlay the
        // new-message editor has. A file attached here is still attached in
        // the compact card, and the other way round (elli-ui#1018, #1189).
        attachments={attachmentTrayProps}
        drag={drag}
        canSend={canSend}
        isSending={isSending}
      />
    );
    const surface = (
      <>
        {editor}
        {reminder.dialog}
      </>
    );
    return layer ? createPortal(surface, layer) : surface;
  }

  return (
    <form
      ref={formRef}
      // Focusable only programmatically: the discard confirm hands focus back
      // here when there is no editor to put it in, so Escape keeps working.
      tabIndex={-1}
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-mail-pane-line bg-mail-card focus:outline-hidden"
      aria-label={
        isForward ? `Forward message from ${message.senderName}` : `Reply to ${recipientLabel}`
      }
      onKeyDown={(event) => {
        keyboardEscape(event);
        keyboardSend(event);
      }}
      onSubmit={onSubmit}
    >
      {/* Peeks out from behind the header's own top edge — rounded on every
          side, with the header (opaque, and pulled up over it) covering its
          bottom corners, so the two read as one stacked card rather than a
          flat banner glued above it. Only when there is something to say: a
          reply to a message with no body and no signature has nothing hidden
          from view. */}
      {showIncludedHint && (
        <div className="relative z-0 flex shrink-0 items-start gap-2 rounded-2xl bg-info-soft px-4 pb-6 pt-3 text-[13px] text-info-soft-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Your signature{quote ? ' and the quoted thread are' : ' is'} included.{' '}
            <button
              type="button"
              className="cursor-pointer font-semibold underline decoration-dotted underline-offset-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              onClick={openFullPage}
            >
              Open full screen
            </button>{' '}
            to edit {quote ? 'them' : 'it'}.
          </p>
        </div>
      )}

      <header
        className={cn(
          'relative z-10 flex min-w-0 shrink-0 items-center gap-2.5 border-b border-mail-pane-line bg-mail-card px-4 py-2.5',
          showIncludedHint && '-mt-4 rounded-t-xl'
        )}
      >
        {recipientLabel && (
          <SenderAvatar
            name={recipientLabel}
            email={isForward ? undefined : message.senderEmail}
            accountId={accountId}
            className="size-6 text-[10px]"
          />
        )}
        <p className="min-w-0 truncate text-[13px] text-mail-mid">
          {/* An empty forward says what it is, not "Forward to someone". */}
          {isForward && !recipientLabel ? (
            'Forward email'
          ) : (
            <>
              {isForward ? 'Forward to' : 'To'}{' '}
              <span className="font-semibold text-mail-ink">{recipientLabel}</span>
              {recipientAddress && <span className="ms-1.5">{recipientAddress}</span>}
            </>
          )}
        </p>

        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <ComposerChromeButton label="Full screen" icon={Maximize2} onClick={openFullPage} />
          <ComposerChromeButton label="Discard" icon={X} iconOnly onClick={onCancel} />
        </div>
      </header>

      {/*
        A forward has nowhere to go until someone says where (elli-ui#1024).
        The header read "Forward to someone" and Send stayed disabled, with the
        only recipient field a full screen away — so the compact composer was a
        dead end for the one mode that cannot infer its own recipient. A reply
        still infers it from the message being answered and shows no field.
      */}
      {isForward && (
        <div className="border-b border-mail-pane-line">
          {/* The field brings its own padding — wrapping it in more is what
              made this row taller than the header above it. */}
          <EmailComposeAddressField
            dense
            id={toId}
            label="To"
            value={to}
            placeholder="Who is this going to?"
            required
            error={addressErrors.to}
            accountId={accountId}
            onChange={(value) => handleAddressChange('to', value)}
          />
        </div>
      )}

      <EmailRichTextEditor
        // The compact card is a quick reply, not a preview of the sent
        // message — the signature and the quoted thread are still in `body`
        // and still go out, but drawing them here turned a one-line reply box
        // into a scroll of logo and legal text. Both stay one click away, in
        // the full-screen editor.
        className="reply-compact-body min-h-0 gap-0"
        id={bodyId}
        value={body}
        label={seed.bodyLabel}
        placeholder={isForward ? 'Add a message (optional)...' : 'Write your reply...'}
        disabled={isSending}
        contentClassName="px-4 py-3"
        editorClassName="min-h-32"
        toolbarClassName="border-t border-mail-pane-line bg-mail-pane px-2.5 py-2"
        toolbarExtras={
          <EmailSignatureMenu
            accountId={accountId}
            body={body}
            onBodyChange={setBody}
            disabled={isSending}
          />
        }
        toolbarTrailing={
          <>
            <button
              type="button"
              className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] text-mail-muted hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
              disabled={isSending}
              aria-label="Attach files"
              title="Attach files"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip aria-hidden="true" className="size-3.5" />
            </button>
            <EmailTemplatesMenu body={body} onBodyChange={setBody} disabled={isSending} iconOnly />
            {sendButton}
          </>
        }
        onChange={setBody}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        // Cleared on every pick so choosing the same file twice in a row still
        // fires a change event; the duplicate is then caught by name and size.
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <EmailComposeAttachmentTray {...attachmentTrayProps} picker={false} />
      {discardDialog}
      {reminder.dialog}
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
  icon: LucideIcon;
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
