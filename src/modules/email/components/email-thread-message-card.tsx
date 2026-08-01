import { useId, useState } from 'react';

import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/app/components/ui/hover-card';
import { cn } from '@/app/lib/utils';
import { EmailAttachmentHoverCard } from '@/modules/email/components/email-attachment-hover-card';
import { EmailMeetingResponseStrip } from '@/modules/email/components/email-meeting-response-strip';
import { EmailMessageBody } from '@/modules/email/components/email-message-body';
import { EmailRecipientDetails } from '@/modules/email/components/email-recipient-details';
import { EmailReplyComposer } from '@/modules/email/components/email-reply-composer';
import type {
  EmailAttachment,
  EmailThreadMessage,
} from '@/modules/email/components/email-row-card';
import { isReferencedInlineEmailAttachment } from '@/modules/email/lib/email-attachments';
import { hasVisibleEmailBodyContent } from '@/modules/email/lib/email-body';
import { formatEmailDate } from '@/modules/email/lib/email-date';
import { isReplyableEmailMessage } from '@/modules/email/lib/email-reply-state';
import { ChevronUp, Forward, Mail, Reply, Star } from 'lucide-react';

interface EmailThreadMessageCardProps {
  message: EmailThreadMessage;
  inlineImageBaseUrl?: string | null;
  singleMessage?: boolean;
  latest?: boolean;
  replyOpen?: boolean;
  isSendingReply?: boolean;
  onReply: (messageId: string) => void;
  onSendReply: (messageId: string, body: string) => Promise<void> | void;
  onCancelReply: () => void;
  onOpenAttachment?: (attachment: EmailAttachment) => void;
  onLoadAttachment?: (messageId: string, attachmentId: string) => Promise<Blob>;
}

export function EmailThreadMessageCard({
  message,
  inlineImageBaseUrl,
  singleMessage = false,
  latest,
  replyOpen,
  isSendingReply = false,
  onReply,
  onSendReply,
  onCancelReply,
  onOpenAttachment,
  onLoadAttachment,
}: EmailThreadMessageCardProps) {
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
  const attachments = message.attachments ?? [];
  const visibleAttachments = attachments.filter(
    (attachment) => !isReferencedInlineEmailAttachment(attachment, message.body)
  );
  const isAlwaysExpanded = singleMessage || visibleAttachments.length > 0;
  const isExpanded = isAlwaysExpanded || Boolean(replyOpen) || isManuallyExpanded;
  const canCollapse = !isAlwaysExpanded && !replyOpen;
  const hasBodyContent = hasVisibleEmailBodyContent(message.body);
  const isSingleAttachmentOnly =
    visibleAttachments.length === 1 && !hasBodyContent && !replyOpen && !latest;
  const tags = message.keywords ?? [];
  const canReply = isReplyableEmailMessage(message);
  const contentId = useId();
  const handleReply = () => {
    if (canReply) onReply(message.id);
  };

  if (!isExpanded) {
    return (
      <article className="overflow-hidden rounded-xl border border-border bg-background shadow-xs">
        <button
          type="button"
          className="group flex min-h-20 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-muted/35 active:bg-muted/55 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-safe:transition-colors motion-safe:duration-100"
          aria-expanded="false"
          aria-controls={contentId}
          aria-label={`Expand message from ${message.senderName}`}
          onClick={() => setIsManuallyExpanded(true)}
        >
          <SenderAvatar name={message.senderName} className="size-9" />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold text-foreground">
                {message.senderName}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {message.deliveryStatus && (
                  <DeliveryStatus status={message.deliveryStatus} compact />
                )}
                <time
                  className="whitespace-nowrap text-xs text-muted-foreground"
                  dateTime={message.sentAt}
                >
                  {formatEmailDate(message.sentAt)}
                </time>
              </div>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {getMessagePreview(message.body)}
            </p>
          </div>
        </button>
        {message.meetingResponse && (
          <EmailMeetingResponseStrip response={message.meetingResponse} collapsed />
        )}
        <div id={contentId} hidden />
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-background shadow-xs">
      <div className="relative flex items-start gap-3 border-b border-border px-4 py-3">
        {canCollapse && (
          <button
            type="button"
            className="absolute inset-0 z-0 cursor-pointer rounded-t-xl hover:bg-muted/35 active:bg-muted/55 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-safe:transition-colors motion-safe:duration-100"
            aria-expanded="true"
            aria-controls={contentId}
            aria-label={`Collapse message from ${message.senderName}`}
            onClick={() => setIsManuallyExpanded(false)}
          />
        )}

        <SenderProfileHoverCard message={message} />

        <div className={cn('relative z-10 min-w-0 flex-1', canCollapse && 'pointer-events-none')}>
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
              <div className={cn(canCollapse && 'pointer-events-auto w-fit max-w-full')}>
                <EmailRecipientDetails message={message} />
              </div>
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
              {message.deliveryStatus && <DeliveryStatus status={message.deliveryStatus} />}
              <time className="mr-2 text-xs text-muted-foreground" dateTime={message.sentAt}>
                {formatEmailDate(message.sentAt)}
              </time>
              <MessageIconAction
                label={`Reply to ${message.senderName}`}
                icon={Reply}
                disabled={!canReply}
                onClick={handleReply}
              />
              <MessageIconAction
                label={`Forward message from ${message.senderName}`}
                icon={Forward}
              />
              {canCollapse && <ChevronUp aria-hidden="true" className="mx-2 size-3.5" />}
            </div>
          </div>
        </div>
      </div>

      {message.meetingResponse && <EmailMeetingResponseStrip response={message.meetingResponse} />}

      <div id={contentId} className={cn('space-y-4 px-4 py-4', isSingleAttachmentOnly && 'py-3')}>
        {hasBodyContent && (
          <EmailMessageBody
            body={message.body}
            attachments={attachments}
            inlineImageBaseUrl={inlineImageBaseUrl}
          />
        )}

        {visibleAttachments.length > 0 && (
          <div
            className={cn('flex flex-wrap gap-2', hasBodyContent && 'pt-1')}
            aria-label="Message attachments"
          >
            {visibleAttachments.map((attachment) => (
              <EmailAttachmentHoverCard
                key={attachment.id}
                attachment={attachment}
                messageId={message.id}
                loadAttachment={onLoadAttachment}
                onOpen={() => onOpenAttachment?.(attachment)}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canReply}
              onClick={handleReply}
            >
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

function SenderAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={cn('shrink-0', className)}>
      <AvatarFallback className="border-0 bg-muted text-xs font-semibold text-muted-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function SenderProfileHoverCard({ message }: { message: EmailThreadMessage }) {
  const initials = getInitials(message.senderName);

  return (
    <HoverCard openDelay={100} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="pointer-events-auto relative z-10 mt-0.5 shrink-0 rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

function DeliveryStatus({
  status,
  compact = false,
}: {
  status: NonNullable<EmailThreadMessage['deliveryStatus']>;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground',
        !compact && 'mr-2'
      )}
    >
      {status === 'sending' ? 'Sending' : status === 'failed' ? 'Failed' : 'Sent'}
    </span>
  );
}

function MessageIconAction({
  label,
  icon: Icon,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: typeof Reply;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      mode="icon"
      size="icon"
      className="pointer-events-auto size-7"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </Button>
  );
}

function getMessagePreview(body: string[]) {
  const preview = body
    .join(' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return preview || 'No message content';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
