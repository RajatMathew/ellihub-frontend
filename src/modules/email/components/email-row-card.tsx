import { cn } from '@/app/lib/utils';
import { formatEmailDate } from '@/modules/email/lib/email-date';
import { Paperclip } from 'lucide-react';

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
  deliveryStatus?: 'sending' | 'failed' | 'sent';
  body: string[];
  attachments?: EmailAttachment[];
};

interface EmailRowCardProps {
  email: EmailListItem;
  selected?: boolean;
  onSelect?: () => void;
}

export function EmailRowCard({ email, selected, onSelect }: EmailRowCardProps) {
  const initials = getInitials(email.senderName);
  const isSelected = selected ?? Boolean(email.selected);
  const visibleTags = (email.keywords ?? []).slice(0, 3);
  const hiddenTagCount = Math.max((email.keywords?.length ?? 0) - visibleTags.length, 0);

  return (
    <button
      type="button"
      className={cn(
        'flex w-full cursor-pointer gap-3 border-b border-border bg-background px-3 py-4 text-left',
        'hover:bg-accent/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        'motion-safe:transition-colors motion-safe:duration-150',
        email.unread && 'bg-muted/35',
        isSelected && 'border-l-2 border-l-primary bg-primary/10 hover:bg-primary/15'
      )}
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`${email.senderName}: ${email.subject}, ${email.unread ? 'unread' : 'read'}`}
      onClick={onSelect}
    >
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground',
          email.unread && 'bg-primary/10 text-primary'
        )}
        aria-hidden="true"
      >
        {initials}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2">
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
              'shrink-0 text-xs',
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
          <span className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
            {Boolean(email.attachmentCount) && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Paperclip aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                {email.attachmentCount}
              </span>
            )}
            {email.category && (
              <span className="max-w-28 truncate rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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
      </span>
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
