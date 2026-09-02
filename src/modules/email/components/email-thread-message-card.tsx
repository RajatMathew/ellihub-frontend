import { useCallback, useId, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/app/components/ui/hover-card';
import { cn } from '@/app/lib/utils';
import { EmailAttachmentHoverCard } from '@/modules/email/components/email-attachment-hover-card';
import { EmailMeetingResponseStrip } from '@/modules/email/components/email-meeting-response-strip';
import { EmailMessageBody } from '@/modules/email/components/email-message-body';
import { EmailRecipientDetails } from '@/modules/email/components/email-recipient-details';
import {
  EmailReplyComposer,
  type EmailComposerMode,
  type EmailReplyDraft,
} from '@/modules/email/components/email-reply-composer';
import type {
  EmailAttachment,
  EmailThreadMessage,
} from '@/modules/email/components/email-row-card';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { isReferencedInlineEmailAttachment } from '@/modules/email/lib/email-attachments';
import { hasVisibleEmailBodyContent } from '@/modules/email/lib/email-body';
import { formatEmailDate } from '@/modules/email/lib/email-date';
import { isReplyableEmailMessage } from '@/modules/email/lib/email-reply-state';
import { SaveToFilesTrigger } from '@/modules/files/save-to-files';
import { ChevronUp, Copy, FolderPlus, Forward, Mail, Reply, Search } from 'lucide-react';
import { toast } from 'sonner';

interface EmailThreadMessageCardProps {
  message: EmailThreadMessage;
  accountId?: string;
  inlineImageBaseUrl?: string | null;
  singleMessage?: boolean;
  latest?: boolean;
  replyOpen?: boolean;
  replyMode?: EmailComposerMode;
  isSendingReply?: boolean;
  onReply: (messageId: string) => void;
  onForward?: (messageId: string) => void;
  onComposeTo?: (address: string) => void;
  onSearchSender?: (address: string) => void;
  onSendReply: (messageId: string, draft: EmailReplyDraft) => Promise<void> | void;
  onCancelReply: () => void;
  onOpenAttachment?: (attachment: EmailAttachment) => void;
  onLoadAttachment?: (messageId: string, attachmentId: string) => Promise<Blob>;
  /**
   * Optional folder subtree that the "Save to Files" picker scopes to. When
   * omitted the picker falls back to the org root (admin-only).
   */
  saveToFilesRootFolderId?: string;
  saveToFilesRootLabel?: string;
}

export function EmailThreadMessageCard({
  message,
  accountId,
  inlineImageBaseUrl,
  singleMessage = false,
  latest,
  replyOpen,
  replyMode = 'reply',
  isSendingReply = false,
  onReply,
  onForward,
  onComposeTo,
  onSearchSender,
  onSendReply,
  onCancelReply,
  onOpenAttachment,
  onLoadAttachment,
  saveToFilesRootFolderId,
  saveToFilesRootLabel,
}: EmailThreadMessageCardProps) {
  // null = no manual choice yet; the default is then "expanded when this is the
  // newest message in the thread", so every conversation opens with exactly one
  // message readable — matching single-message threads, which are always open.
  const [manuallyExpanded, setManuallyExpanded] = useState<boolean | null>(null);
  const attachments = message.attachments ?? [];
  const visibleAttachments = attachments.filter(
    (attachment) => !isReferencedInlineEmailAttachment(attachment, message.body)
  );
  // Attachments must not lock a thread card open: every message in a
  // conversation remains collapsible unless it is the only message displayed.
  const isAlwaysExpanded = singleMessage;
  const isExpanded =
    isAlwaysExpanded || Boolean(replyOpen) || (manuallyExpanded ?? Boolean(latest));
  const canCollapse = !isAlwaysExpanded && !replyOpen;
  const hasBodyContent = hasVisibleEmailBodyContent(message.body);
  const isSingleAttachmentOnly =
    visibleAttachments.length === 1 && !hasBodyContent && !replyOpen && !latest;
  const tags = message.keywords ?? [];
  const canReply = isReplyableEmailMessage(message);
  // An in-flight/failed message shows its DeliveryStatus badge in the slot
  // where the timestamp normally sits; its sentAt is only the 'Sending...'
  // placeholder, so rendering both reads "Sending Sending...".
  const showTimestamp = !message.deliveryStatus || message.deliveryStatus === 'sent';
  const contentId = useId();
  const handleReply = () => {
    if (canReply) onReply(message.id);
  };
  const canForward = canReply && Boolean(onForward);
  const handleForward = () => {
    if (canForward) onForward?.(message.id);
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
          onClick={() => setManuallyExpanded(true)}
        >
          <SenderAvatar
            name={message.senderName}
            email={message.senderEmail}
            accountId={accountId}
            className="size-9"
          />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold text-foreground">
                {message.senderName}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {message.deliveryStatus && (
                  <DeliveryStatus status={message.deliveryStatus} compact />
                )}
                {showTimestamp && (
                  <time
                    className="whitespace-nowrap text-xs text-muted-foreground"
                    dateTime={message.sentAt}
                  >
                    {formatEmailDate(message.sentAt)}
                  </time>
                )}
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
            onClick={() => setManuallyExpanded(false)}
          />
        )}

        <SenderProfileHoverCard
          message={message}
          accountId={accountId}
          onCompose={onComposeTo}
          onSearchSender={onSearchSender}
        />

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
              {showTimestamp && (
                <time className="mr-2 text-xs text-muted-foreground" dateTime={message.sentAt}>
                  {formatEmailDate(message.sentAt)}
                </time>
              )}
              <MessageIconAction
                label={`Reply to ${message.senderName}`}
                icon={Reply}
                disabled={!canReply}
                onClick={handleReply}
              />
              <MessageIconAction
                label={`Forward message from ${message.senderName}`}
                icon={Forward}
                disabled={!canForward}
                onClick={handleForward}
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
              <EmailAttachmentChip
                key={attachment.id}
                attachment={attachment}
                messageId={message.id}
                onLoadAttachment={onLoadAttachment}
                onOpenAttachment={onOpenAttachment}
                saveToFilesRootFolderId={saveToFilesRootFolderId}
                saveToFilesRootLabel={saveToFilesRootLabel}
              />
            ))}
          </div>
        )}

        {replyOpen && (
          <EmailReplyComposer
            key={replyMode}
            message={message}
            mode={replyMode}
            isSending={isSendingReply}
            onSend={(draft) => onSendReply(message.id, draft)}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canForward}
              onClick={handleForward}
            >
              <Forward aria-hidden="true" className="size-3.5" />
              Forward
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function SenderProfileHoverCard({
  message,
  accountId,
  onCompose,
  onSearchSender,
}: {
  message: EmailThreadMessage;
  accountId?: string;
  onCompose?: (address: string) => void;
  onSearchSender?: (address: string) => void;
}) {
  const address = message.senderEmail;

  return (
    <HoverCard openDelay={100} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="pointer-events-auto relative z-10 mt-0.5 shrink-0 cursor-pointer rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`View ${message.senderName} profile`}
        >
          <SenderAvatar
            name={message.senderName}
            email={address}
            accountId={accountId}
            className="size-9"
          />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 p-0">
        <div className="flex items-center gap-3 p-4">
          <SenderAvatar
            name={message.senderName}
            email={address}
            accountId={accountId}
            className="size-12 text-base"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{message.senderName}</p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">{address}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 border-t border-border px-2 py-2">
          {onCompose && (
            <button
              type="button"
              className="flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-muted/50 px-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
              onClick={() => onCompose(address)}
            >
              <Mail aria-hidden="true" className="size-3.5" />
              <span className="truncate">Send mail</span>
            </button>
          )}
          {onSearchSender && (
            <button
              type="button"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
              aria-label={`Find emails from ${message.senderName}`}
              onClick={() => onSearchSender(address)}
            >
              <Search aria-hidden="true" className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
            aria-label={`Copy ${address}`}
            onClick={() => {
              void navigator.clipboard.writeText(address).then(
                () => toast.success('Email address copied.'),
                () => toast.error('Could not copy the address.')
              );
            }}
          >
            <Copy aria-hidden="true" className="size-3.5" />
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

function EmailAttachmentChip({
  attachment,
  messageId,
  onLoadAttachment,
  onOpenAttachment,
  saveToFilesRootFolderId,
  saveToFilesRootLabel,
}: {
  attachment: EmailAttachment;
  messageId: string;
  onLoadAttachment?: (messageId: string, attachmentId: string) => Promise<Blob>;
  onOpenAttachment?: (attachment: EmailAttachment) => void;
  saveToFilesRootFolderId?: string;
  saveToFilesRootLabel?: string;
}) {
  const resolveAttachment = useCallback(async (): Promise<Blob> => {
    if (!onLoadAttachment) {
      throw new Error('This attachment cannot be downloaded right now.');
    }
    return onLoadAttachment(messageId, attachment.id);
  }, [attachment.id, messageId, onLoadAttachment]);

  const canSaveToFiles = Boolean(onLoadAttachment);

  return (
    <div className="inline-flex max-w-full items-center gap-1">
      <EmailAttachmentHoverCard
        attachment={attachment}
        messageId={messageId}
        loadAttachment={onLoadAttachment}
        onOpen={() => onOpenAttachment?.(attachment)}
      />
      {canSaveToFiles && (
        <SaveToFilesTrigger
          asChild
          source={{
            kind: 'lazy',
            fileName: attachment.name,
            mimeType: attachment.mimeType ?? undefined,
            resolve: resolveAttachment,
          }}
          rootFolderId={saveToFilesRootFolderId}
          rootLabel={saveToFilesRootLabel ?? 'Project Files'}
          onSaved={() => toast.success(`Saved ${attachment.name} to Files.`)}
        >
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            size="sm"
            className="size-8 shrink-0"
            aria-label={`Save ${attachment.name} to Files`}
            title="Save to Files"
          >
            <FolderPlus aria-hidden="true" className="size-3.5" />
          </Button>
        </SaveToFilesTrigger>
      )}
    </div>
  );
}
