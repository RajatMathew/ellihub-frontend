import { useEffect, useId, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { EmailRichTextEditor } from '@/modules/email/components/email-rich-text-editor';
import type { EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { getEmailAddressListError } from '@/modules/email/lib/email-addresses';
import { isEmptyEmailHtml } from '@/modules/email/lib/email-rich-text';
import { Paperclip, Send, Trash2 } from 'lucide-react';

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
  isSending?: boolean;
  onSend: (draft: EmailReplyDraft) => Promise<void> | void;
  onCancel: () => void;
}

export function EmailReplyComposer({
  message,
  mode = 'reply',
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
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Partial<Record<'to' | 'cc' | 'bcc', string>>>(
    {}
  );
  const toId = useId();
  const ccId = useId();
  const bccId = useId();
  const bodyId = useId();
  const canSend = (isForward || !isEmptyEmailHtml(body)) && to.trim().length > 0 && !isSending;

  useEffect(() => {
    // A forward needs a recipient first; a reply already has one.
    document.getElementById(isForward ? toId : bodyId)?.focus();
  }, [bodyId, isForward, toId]);

  return (
    <form
      className="rounded-md border border-border bg-background"
      aria-label={
        isForward ? `Forward message from ${message.senderName}` : `Reply to ${message.senderName}`
      }
      onKeyDown={(event) => {
        // Cmd/Ctrl + Enter sends, matching the new-message composer.
        if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        if (canSend) event.currentTarget.requestSubmit();
      }}
      onSubmit={async (event) => {
        event.preventDefault();
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
      }}
    >
      <div className="divide-y divide-border border-b border-border">
        <ReplyAddressField
          id={toId}
          label="To"
          value={to}
          required
          disabled={isSending}
          error={addressErrors.to}
          onChange={(value) => {
            setTo(value);
            setAddressErrors((current) => ({ ...current, to: undefined }));
          }}
        >
          {!showCc && (
            <button
              type="button"
              className="rounded-sm px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isSending}
              onClick={() => setShowCc(true)}
            >
              Cc
            </button>
          )}
          {!showBcc && (
            <button
              type="button"
              className="rounded-sm px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isSending}
              onClick={() => setShowBcc(true)}
            >
              Bcc
            </button>
          )}
        </ReplyAddressField>
        {showCc && (
          <ReplyAddressField
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
        )}
        {showBcc && (
          <ReplyAddressField
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
        )}
      </div>

      <div className="space-y-3 p-4">
        <EmailRichTextEditor
          id={bodyId}
          value={body}
          label={isForward ? 'Forward message' : 'Reply message'}
          placeholder={isForward ? 'Add a message (optional)...' : 'Write your reply...'}
          disabled={isSending}
          editorClassName="min-h-36"
          onChange={setBody}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button type="submit" size="sm" disabled={!canSend}>
            <Send aria-hidden="true" className="size-3.5" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground"
            disabled={isSending}
          >
            <Paperclip aria-hidden="true" className="size-3.5" />
            Attach
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground"
            disabled={isSending}
            onClick={onCancel}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            Discard
          </Button>
        </div>
      </div>
    </form>
  );
}

function ReplyAddressField({
  id,
  label,
  value,
  required,
  disabled,
  error,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor={id} className="w-7 shrink-0 text-xs font-medium text-muted-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
        <Input
          id={id}
          type="text"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={value}
          placeholder="recipient@example.com"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        {children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
      </div>
      {error && (
        <p id={errorId} className="pt-1 pl-9 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
