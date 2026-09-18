import { useEffect, useId, useState } from 'react';

import { cn } from '@/app/lib/utils';
import { EmailRichTextEditor } from '@/modules/email/components/email-rich-text-editor';
import type { EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { getEmailAddressListError } from '@/modules/email/lib/email-addresses';
import { isEmptyEmailHtml } from '@/modules/email/lib/email-rich-text';
import { Maximize2, Minimize2, Paperclip, Send, X } from 'lucide-react';

export type EmailReplyDraft = {
  /** Rich-text HTML, sent with `bodyType: 'html'`. */
  body: string;
  to: string;
  cc: string;
  bcc: string;
};

export type EmailComposerMode = 'reply' | 'forward';

interface EmailReplyComposerProps {
  message: EmailThreadMessage;
  mode?: EmailComposerMode;
  /** Shown in the full-screen subject row; the thread's own subject. */
  subject?: string;
  accountId?: string;
  isSending?: boolean;
  onSend: (draft: EmailReplyDraft) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Replying, inline in the thread or filling the pane.
 *
 * Two states of one composer rather than two composers. Collapsed it is a
 * header, a writing surface and a footer — who it goes to, and nothing else,
 * because a reply already knows its recipient and its subject. Full screen adds
 * the rows that only matter when you want to change those: the recipient chips,
 * Cc/Bcc, and the subject.
 *
 * The footer is one row: the formatting toolbar, where the message will land,
 * and Send. The old composer spent three rows on that and put Discard beside
 * Send, where a missed click costs you the draft — closing is the ✕ in the
 * header now, away from the button you are aiming for (elli-ui#921).
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
  const [body, setBody] = useState('');
  const isForward = mode === 'forward';
  // A forward starts with no recipient; a reply targets the sender.
  const [to, setTo] = useState(isForward ? '' : message.senderEmail);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Partial<Record<'to' | 'cc' | 'bcc', string>>>(
    {}
  );
  const toId = useId();
  const ccId = useId();
  const bccId = useId();
  const bodyId = useId();
  const canSend = (isForward || !isEmptyEmailHtml(body)) && to.trim().length > 0 && !isSending;
  const recipientLabel = isForward ? to.trim() || 'someone' : message.senderName || to;

  useEffect(() => {
    // A forward needs a recipient first; a reply already has one.
    document.getElementById(isForward ? toId : bodyId)?.focus();
  }, [bodyId, isForward, toId]);

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

  return (
    <form
      className={cn(
        'flex min-w-0 flex-col overflow-hidden bg-mail-card',
        // Absolute, not fixed: full screen means the reading pane, not the
        // window. Covering the whole app hid the list and the nav for the sake
        // of a wider text box, which is not what anyone meant by it.
        isFullScreen
          ? 'absolute inset-0 z-30 rounded-none border-0'
          : 'rounded-xl border border-mail-pane-line'
      )}
      aria-label={
        isForward ? `Forward message from ${message.senderName}` : `Reply to ${recipientLabel}`
      }
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isFullScreen) {
          // Escape steps out of full screen rather than throwing the draft away
          // — the ✕ is the way to discard, and it is one more deliberate click.
          event.preventDefault();
          event.stopPropagation();
          setIsFullScreen(false);
          return;
        }
        // Cmd/Ctrl + Enter sends, matching the new-message composer.
        if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        if (canSend) event.currentTarget.requestSubmit();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <header className="flex min-w-0 shrink-0 items-center gap-2.5 border-b border-mail-pane-line px-4 py-2.5">
        {isFullScreen ? (
          <h2 className="text-[13.5px] font-semibold text-mail-ink">
            {isForward ? 'Forward' : 'Reply'}
          </h2>
        ) : (
          <>
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
          </>
        )}

        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <ComposerChromeButton
            label={isFullScreen ? 'Collapse' : 'Full screen'}
            icon={isFullScreen ? Minimize2 : Maximize2}
            bordered={isFullScreen}
            onClick={() => setIsFullScreen((full) => !full)}
          />
          <ComposerChromeButton
            label="Discard"
            icon={X}
            iconOnly
            bordered={isFullScreen}
            onClick={onCancel}
          />
        </div>
      </header>

      {isFullScreen && (
        <div className="shrink-0 divide-y divide-mail-hair border-b border-mail-pane-line px-4">
          <ComposerAddressRow
            id={toId}
            label="To"
            value={to}
            required
            disabled={isSending}
            error={addressErrors.to}
            placeholder="Name or address"
            onChange={(value) => {
              setTo(value);
              setAddressErrors((current) => ({ ...current, to: undefined }));
            }}
          >
            {!showCcBcc && (
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-[12.5px] text-mail-muted hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowCcBcc(true)}
              >
                Cc / Bcc
              </button>
            )}
          </ComposerAddressRow>
          {showCcBcc && (
            <>
              <ComposerAddressRow
                id={ccId}
                label="Cc"
                value={cc}
                disabled={isSending}
                error={addressErrors.cc}
                onChange={(value) => {
                  setCc(value);
                  setAddressErrors((current) => ({ ...current, cc: undefined }));
                }}
              />
              <ComposerAddressRow
                id={bccId}
                label="Bcc"
                value={bcc}
                disabled={isSending}
                error={addressErrors.bcc}
                onChange={(value) => {
                  setBcc(value);
                  setAddressErrors((current) => ({ ...current, bcc: undefined }));
                }}
              />
            </>
          )}
          {subject && (
            <div className="flex min-w-0 max-w-4xl items-center gap-3 py-2.5">
              <span className="w-16 shrink-0 text-[12.5px] text-mail-muted">Subject</span>
              <p className="min-w-0 truncate text-[13.5px] text-mail-ink">{subject}</p>
            </div>
          )}
        </div>
      )}

      <EmailRichTextEditor
        className={cn('min-h-0 gap-0', isFullScreen && 'flex-1')}
        id={bodyId}
        value={body}
        label={isForward ? 'Forward message' : 'Reply message'}
        placeholder={
          isFullScreen
            ? 'Write your message...'
            : isForward
              ? 'Add a message (optional)...'
              : 'Write your reply...'
        }
        disabled={isSending}
        contentClassName={isFullScreen ? 'w-full max-w-4xl px-4 py-4' : 'px-4 py-3'}
        editorClassName={isFullScreen ? 'min-h-full' : 'min-h-32'}
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
              {isFullScreen
                ? 'Lands at the end of the thread'
                : 'Your reply lands at the end of the thread'}
            </span>
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-mail-accent px-3 py-1.5 text-[12.5px] font-semibold text-mail-accent-foreground hover:bg-mail-accent-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-45"
            >
              {isSending ? 'Sending…' : 'Send'}
              <Send aria-hidden="true" className="size-3" />
            </button>
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
  bordered = false,
  onClick,
}: {
  label: string;
  icon: typeof Send;
  iconOnly?: boolean;
  bordered?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] text-mail-mid',
        'hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
        bordered && 'border border-mail-pane-line hover:border-mail-row-edge'
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

function ComposerAddressRow({
  id,
  label,
  value,
  required,
  disabled,
  error,
  placeholder = 'Name or address',
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  children?: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="py-2.5">
      {/* The fields are capped and left-aligned with the header and the toolbar.
          Unbounded, To ran the pane's full width with Cc / Bcc stranded at the
          far edge. The divider above stays full width, so the block still reads
          as one bar rather than a column floating in it. */}
      <div className="flex min-w-0 max-w-4xl items-center gap-3">
        <label htmlFor={id} className="w-16 shrink-0 text-[12.5px] text-mail-muted">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
        <input
          id={id}
          type="text"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-mail-ink outline-hidden placeholder:text-mail-muted"
          onChange={(event) => onChange(event.target.value)}
        />
        {children}
      </div>
      {error && (
        <p id={errorId} className="max-w-4xl ps-[76px] pt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
