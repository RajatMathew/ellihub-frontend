import { cn } from '@/app/lib/utils';
import type { EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { Forward, Reply, ReplyAll } from 'lucide-react';

interface MailReplyStripProps {
  /** The message a reply would answer — the newest one that can be replied to. */
  message: EmailThreadMessage;
  canForward: boolean;
  onReply: (messageId: string) => void;
  onForward: (messageId: string) => void;
}

/**
 * The always-there way into a reply, above the messages rather than buried at
 * the bottom of the last one.
 *
 * Replying is the most common thing anyone does with an open thread, and the
 * old placement made it the thing furthest from where the reader lands — on a
 * long conversation it was a scroll away. The strip sits directly under the
 * subject, and the three quick actions do what their per-message equivalents
 * do, aimed at the newest message (elli-ui#921).
 */
export function MailReplyStrip({ message, canForward, onReply, onForward }: MailReplyStripProps) {
  const recipient = message.senderName || message.senderEmail;

  return (
    <div className="mb-3 flex min-w-0 items-center gap-2.5 rounded-xl border border-mail-pane-line bg-mail-card p-3 motion-safe:transition-colors motion-safe:duration-100 hover:border-mail-row-edge">
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onReply(message.id)}
      >
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-mail-pane text-mail-mid">
          <Reply aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] text-mail-muted">
          Reply to {recipient}…
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <QuickReplyAction label="Reply" onClick={() => onReply(message.id)}>
          <Reply aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
        </QuickReplyAction>
        <QuickReplyAction label="Reply all" onClick={() => onReply(message.id)}>
          <ReplyAll aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
        </QuickReplyAction>
        {canForward && (
          <QuickReplyAction label="Forward" onClick={() => onForward(message.id)}>
            <Forward aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          </QuickReplyAction>
        )}
      </div>
    </div>
  );
}

function QuickReplyAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-xs text-mail-muted',
        'hover:bg-mail-pane hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        'motion-safe:transition-colors motion-safe:duration-100'
      )}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
