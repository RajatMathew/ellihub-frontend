import { useEffect, useRef } from 'react';

import { cn } from '@/app/lib/utils';
import type { EmailMeetingEvent } from '@/modules/email/api';
import { formatEmailDate } from '@/modules/email/lib/email-date';
import { Archive, Paperclip, Trash2 } from 'lucide-react';

export type EmailListItem = {
  id: string;
  latestMessageId?: string;
  providerId?: string;
  threadId?: string | null;
  conversationKey?: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  preview: string;
  receivedAt: string;
  folderId?: string | null;
  folder: string;
  mailbox: string;
  unread: boolean;
  keywords?: string[];
  meetingResponse?: EmailMeetingResponse;
  meetingEvent?: EmailMeetingEvent;
  selected?: boolean;
  attachmentCount?: number;
  category?: string;
  body?: string[];
  attachments?: EmailAttachment[];
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  threadMessages?: EmailThreadMessage[];
  threadMessageCount?: number;
};

export type EmailAddress = {
  address: string;
  name?: string;
};

export type EmailAttachment = {
  id: string;
  providerId?: string;
  name: string;
  size?: string;
  sizeBytes?: number;
  mimeType?: string | null;
  inline?: boolean;
  contentId?: string | null;
  contentUrl?: string;
};

export type EmailMeetingResponse = {
  status: 'accepted' | 'tentative' | 'declined' | 'cancelled';
  responderName: string;
  responderEmail?: string;
  startAt?: string;
  endAt?: string;
  eventType?: string;
};

export type EmailThreadMessage = {
  id: string;
  providerId?: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  sentAt: string;
  folderId?: string | null;
  keywords?: string[];
  meetingResponse?: EmailMeetingResponse;
  meetingEvent?: EmailMeetingEvent;
  deliveryStatus?: 'sending' | 'failed' | 'sent';
  body: string[];
  attachments?: EmailAttachment[];
};

interface EmailRowCardProps {
  email: EmailListItem;
  selected?: boolean;
  onSelect?: () => void;
  onPrefetch?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export function EmailRowCard({
  email,
  selected,
  onSelect,
  onPrefetch,
  onArchive,
  onDelete,
}: EmailRowCardProps) {
  const isSelected = selected ?? Boolean(email.selected);
  const cardRef = useRef<HTMLElement>(null);
  const visibleTags = (email.keywords ?? []).slice(0, 2);
  const hiddenTagCount = Math.max((email.keywords?.length ?? 0) - visibleTags.length, 0);
  const hasQuickActions = Boolean(onArchive || onDelete);

  useEffect(() => {
    if (!isSelected) return;

    cardRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [isSelected]);

  return (
    <article
      ref={cardRef}
      className={cn(
        'group relative mx-3 mt-2 overflow-hidden rounded-md border bg-background',
        'motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-100',
        email.unread && 'bg-muted/25',
        isSelected
          ? 'border-primary/80 bg-primary/10 shadow-sm ring-1 ring-primary/15'
          : 'border-border hover:border-foreground/25 hover:shadow-xs'
      )}
    >
      <button
        type="button"
        className="w-full cursor-pointer px-3 py-2.5 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-current={isSelected ? 'true' : undefined}
        aria-label={`${email.senderName}: ${email.subject}, ${email.unread ? 'unread' : 'read'}`}
        onPointerEnter={onPrefetch}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button === 0) onSelect?.();
        }}
        onFocus={onPrefetch}
        onClick={(event) => {
          const pointerType = (event.nativeEvent as PointerEvent).pointerType;
          if (pointerType === 'mouse' && event.detail > 0) return;
          onSelect?.();
        }}
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span
            className={cn(
              'size-2 shrink-0 rounded-full border border-border',
              email.unread && 'border-primary bg-primary'
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm text-foreground',
              email.unread ? 'font-semibold' : 'font-medium'
            )}
          >
            {email.senderName}
          </span>
          {email.threadMessageCount && email.threadMessageCount > 1 && (
            <span
              className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold leading-none text-muted-foreground"
              title={`${email.threadMessageCount} messages in this thread`}
            >
              {email.threadMessageCount}
            </span>
          )}
          <span
            className={cn(
              'shrink-0 font-mono text-xs tabular-nums',
              email.unread ? 'font-semibold text-foreground' : 'text-muted-foreground'
            )}
            title={email.receivedAt}
          >
            {formatEmailDate(email.receivedAt)}
          </span>
        </span>

        <span
          className={cn(
            'mt-1 block truncate text-sm text-foreground',
            email.unread ? 'font-semibold' : 'font-medium'
          )}
        >
          {email.subject}
        </span>

        <span
          className={cn(
            'mt-1 line-clamp-2 text-sm leading-5',
            email.unread ? 'text-foreground/80' : 'text-muted-foreground'
          )}
        >
          {email.preview}
        </span>

        {(email.attachmentCount || email.category || visibleTags.length > 0) && (
          <span className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 pr-16">
            {Boolean(email.attachmentCount) && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Paperclip aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                {email.attachmentCount}
              </span>
            )}
            {email.category && (
              <span className="max-w-28 truncate rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {email.category}
              </span>
            )}
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="max-w-28 truncate rounded-sm border border-border bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {hiddenTagCount > 0 && (
              <span className="text-xs font-medium text-muted-foreground">+{hiddenTagCount}</span>
            )}
          </span>
        )}
      </button>

      {hasQuickActions && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-border bg-background p-0.5 opacity-100 shadow-xs lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 motion-safe:transition-opacity motion-safe:duration-100">
          {onArchive && (
            <button
              type="button"
              className="flex size-10 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px lg:size-8 motion-safe:transition-colors motion-safe:duration-100"
              aria-label={`Archive ${email.subject}`}
              title="Archive"
              onClick={onArchive}
            >
              <Archive aria-hidden="true" className="size-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="flex size-10 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px lg:size-8 motion-safe:transition-colors motion-safe:duration-100"
              aria-label={`Delete ${email.subject}`}
              title="Delete"
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
