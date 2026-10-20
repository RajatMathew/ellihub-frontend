import { Button } from '@/app/components/ui/button';
import { useLingering } from '@/app/hooks/use-lingering';
import { formatDateTime } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { EmailMessageAttachments } from '@/modules/email/components/email-message-attachments';
import { EmailMessageBody } from '@/modules/email/components/email-message-body';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { useEmailMessageQuery } from '@/modules/email/hooks/email.hooks';
import { formatEmailAddress } from '@/modules/email/lib/email-addresses';
import { Mail, X } from 'lucide-react';

/**
 * The mail Elliot is working from, readable beside the chat. Full screen hides
 * the mailbox, and a user checking a quote against the PO Elliot proposes
 * should not have to leave to see it. Every thread in context is listed; the
 * one on screen is the one whose chip the user last picked. Slides open and
 * closed; the content stays while the pane narrows so it does not blink out.
 */
export function AgentEmailPane({
  open,
  emails,
  pickedId,
  onPick,
  accountId,
  mailboxAddress,
  inlineImageBaseUrl,
  onClose,
}: {
  open: boolean;
  /** The thread on screen; the rail's actions point here too. */
  pickedId: string | null;
  onPick: (id: string) => void;
  /** The open mail first, then the threads added to the chat. */
  emails: EmailListItem[];
  accountId?: string;
  mailboxAddress: string;
  inlineImageBaseUrl?: string | null;
  onClose: () => void;
}) {
  const mounted = useLingering(open, 220);
  const shown = emails.find((item) => item.id === pickedId) ?? emails[0] ?? null;
  const messageId = shown ? (shown.latestMessageId ?? shown.id) : null;
  // The list row carries a preview; the message itself has the body and files.
  const detail = useEmailMessageQuery(accountId, messageId, open);
  const message = detail.data ?? shown;
  const body = message?.body?.length ? message.body : null;
  const others = emails.filter((item) => item.id !== shown?.id);

  return (
    <aside
      aria-label="Email in context"
      aria-hidden={!open}
      className={cn(
        'flex shrink-0 flex-col overflow-hidden bg-card',
        'motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out',
        open
          ? 'w-96 border-l border-border max-md:absolute max-md:inset-0 max-md:z-20 max-md:w-full max-md:border-l-0'
          : 'w-0'
      )}
    >
      {!mounted ? null : (
        <div className="flex h-full w-96 shrink-0 flex-col max-md:w-full">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <Mail className="size-4 text-muted-foreground" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Email in context
            </p>
            <span className="flex-1" />
            <Button variant="ghost" size="icon" aria-label="Hide email" onClick={onClose}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          {!shown ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Open an email, or add a thread with @, and it shows here.
            </p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <h3 className="text-base font-semibold leading-snug">
                {shown.subject || '(No subject)'}
              </h3>
              <dl className="grid grid-cols-[3rem_1fr] gap-x-2 gap-y-1 text-xs">
                <dt className="text-muted-foreground">From</dt>
                <dd className="truncate">
                  {formatEmailAddress({ address: shown.senderEmail, name: shown.senderName })}
                </dd>
                <dt className="text-muted-foreground">To</dt>
                <dd className="truncate">
                  {shown.to?.length ? shown.to.map(formatEmailAddress).join(', ') : mailboxAddress}
                </dd>
                {shown.cc?.length ? (
                  <>
                    <dt className="text-muted-foreground">Cc</dt>
                    <dd className="truncate">{shown.cc.map(formatEmailAddress).join(', ')}</dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">Date</dt>
                <dd>{formatDateTime(shown.receivedAt)}</dd>
              </dl>

              {message?.attachments?.length && messageId ? (
                <EmailMessageAttachments attachments={message.attachments} messageId={messageId} />
              ) : null}

              <div className="border-t border-border pt-3 text-sm">
                {body ? (
                  <EmailMessageBody
                    body={body}
                    attachments={message?.attachments ?? []}
                    inlineImageBaseUrl={inlineImageBaseUrl}
                  />
                ) : detail.isPending ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    Loading the message…
                  </p>
                ) : (
                  <p className="whitespace-pre-line text-muted-foreground">{shown.preview}</p>
                )}
              </div>

              {others.length > 0 ? (
                <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Also in context
                  </p>
                  {others.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onPick(item.id)}
                      className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {item.subject || '(No subject)'}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{item.senderName}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
