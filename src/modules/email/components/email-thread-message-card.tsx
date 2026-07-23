import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/app/components/ui/hover-card';
import { EmailMessageBody } from '@/modules/email/components/email-message-body';
import { EmailReplyComposer } from '@/modules/email/components/email-reply-composer';
import type {
  EmailAttachment,
  EmailThreadMessage,
} from '@/modules/email/components/email-row-card';
import { isInlineEmailAttachment } from '@/modules/email/lib/email-attachments';
import { formatEmailDate } from '@/modules/email/lib/email-date';
import { FileText, Forward, Mail, Reply, Star } from 'lucide-react';

interface EmailThreadMessageCardProps {
  message: EmailThreadMessage;
  latest?: boolean;
  replyOpen?: boolean;
  isSendingReply?: boolean;
  onReply: (messageId: string) => void;
  onSendReply: (messageId: string, body: string) => Promise<void> | void;
  onCancelReply: () => void;
  onOpenAttachment?: (attachment: EmailAttachment) => void;
}

export function EmailThreadMessageCard({
  message,
  latest,
  replyOpen,
  isSendingReply = false,
  onReply,
  onSendReply,
  onCancelReply,
  onOpenAttachment,
}: EmailThreadMessageCardProps) {
  const attachments = message.attachments ?? [];
  const visibleAttachments = attachments.filter(
    (attachment) => !isInlineEmailAttachment(attachment)
  );
  const tags = message.keywords ?? [];
  const handleReply = () => onReply(message.id);

  return (
    <article className="rounded-md border border-border bg-background">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <SenderProfileHoverCard message={message} />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="truncate text-sm font-semibold text-foreground">
                  {message.senderName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {message.senderEmail}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                To: {message.recipientName} &lt;{message.recipientEmail}&gt;
              </p>
              {tags.length > 0 && (
                <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="max-w-36 truncate rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {message.deliveryStatus && (
                <span className="mr-2 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {message.deliveryStatus === 'sending'
                    ? 'Sending'
                    : message.deliveryStatus === 'failed'
                      ? 'Failed'
                      : 'Sent'}
                </span>
              )}
              <time className="mr-2 text-xs text-muted-foreground" dateTime={message.sentAt}>
                {formatEmailDate(message.sentAt)}
              </time>
              <MessageIconAction
                label={`Reply to ${message.senderName}`}
                icon={Reply}
                onClick={handleReply}
              />
              <MessageIconAction
                label={`Forward message from ${message.senderName}`}
                icon={Forward}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <EmailMessageBody body={message.body} attachments={attachments} />

        {visibleAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1" aria-label="Message attachments">
            {visibleAttachments.map((attachment) => (
              <EmailAttachmentChip
                key={attachment.id}
                attachment={attachment}
                onClick={() => onOpenAttachment?.(attachment)}
              />
            ))}
          </div>
        )}

        {replyOpen && (
          <EmailReplyComposer
            message={message}
            isSending={isSendingReply}
            onSend={(body) => onSendReply(message.id, body)}
            onCancel={onCancelReply}
          />
        )}

        {latest && !replyOpen && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={handleReply}>
              <Reply aria-hidden="true" className="size-3.5" />
              Reply
            </Button>
            <Button type="button" variant="outline" size="sm">
              <Forward aria-hidden="true" className="size-3.5" />
              Forward
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function SenderProfileHoverCard({ message }: { message: EmailThreadMessage }) {
  const initials = getInitials(message.senderName);

  return (
    <HoverCard openDelay={100} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`View ${message.senderName} profile`}
        >
          <Avatar className="size-9">
            <AvatarFallback className="border-0 bg-muted text-xs font-semibold text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 p-0">
        <div className="flex gap-3 p-4 pb-3">
          <Avatar className="size-10">
            <AvatarFallback className="border-0 bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{message.senderName}</p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">{message.senderEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 border-t border-border px-2 py-2">
          <button
            type="button"
            className="flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-muted/50 px-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
          >
            <Star aria-hidden="true" className="size-3.5" />
            <span className="truncate">Add favourite</span>
          </button>
          <button
            type="button"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
            aria-label={`Email ${message.senderName}`}
          >
            <Mail aria-hidden="true" />
          </button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function MessageIconAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Reply;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      mode="icon"
      size="icon"
      className="size-7"
      aria-label={label}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </Button>
  );
}

function EmailAttachmentChip({
  attachment,
  onClick,
}: {
  attachment: EmailAttachment;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex min-h-9 max-w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-left text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
      onClick={onClick}
    >
      <FileText aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{attachment.name}</span>
      {attachment.size && <span className="shrink-0 text-muted-foreground">{attachment.size}</span>}
    </button>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
