import { cn } from '@/app/lib/utils';
import { Paperclip } from 'lucide-react';

export type EmailListItem = {
  id: string;
  providerId?: string;
  threadId?: string | null;
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
  threadMessages?: EmailThreadMessage[];
};

export type EmailAttachment = {
  id: string;
  providerId?: string;
  name: string;
  size?: string;
  mimeType?: string | null;
};

export type EmailThreadMessage = {
  id: string;
  providerId?: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  sentAt: string;
  folderId?: string | null;
  keywords?: string[];
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
        'flex w-full cursor-pointer gap-3 border-b border-border px-3 py-4 text-left',
        'hover:bg-accent/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        'motion-safe:transition-colors motion-safe:duration-150',
        isSelected && 'border-l-2 border-l-primary bg-primary/10 hover:bg-primary/15'
      )}
      aria-current={isSelected ? 'true' : undefined}
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
          <span className="shrink-0 text-xs text-muted-foreground">{email.receivedAt}</span>
        </span>

        <span
          className={cn(
            'mt-1 block truncate text-sm text-foreground',
            email.unread ? 'font-semibold' : 'font-medium'
          )}
        >
          {email.subject}
        </span>

        <span className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
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
