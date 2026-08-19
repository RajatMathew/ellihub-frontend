import { useEffect, useRef } from 'react';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import type { EmailMeetingEvent, EmailThreadClassification } from '@/modules/email/api';
import { EmailThreadStatusPill } from '@/modules/email/components/email-reference-marker';
import { formatEmailDate } from '@/modules/email/lib/email-date';
import { Archive, BriefcaseBusiness, Paperclip, Trash2 } from 'lucide-react';

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
  classification?: EmailThreadClassification;
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
  /**
   * Bulk-selection state (separate from `selected`, which tracks the row
   * currently open in the reading pane).
   */
  isChecked?: boolean;
  /** Undefined disables the bulk-select checkbox entirely. */
  onCheckedChange?: (next: boolean) => void;
  /** When true, at least one row in the list is checked — show every row's
   *  checkbox permanently instead of only on hover, so the user has a clear
   *  visual affordance for extending the selection. */
  bulkSelectActive?: boolean;
}

export function EmailRowCard({
  email,
  selected,
  onSelect,
  onPrefetch,
  onArchive,
  onDelete,
  isChecked = false,
  onCheckedChange,
  bulkSelectActive = false,
}: EmailRowCardProps) {
  const isSelected = selected ?? Boolean(email.selected);
  const isCheckable = Boolean(onCheckedChange);
  const cardRef = useRef<HTMLElement>(null);
  const visibleTags = (email.keywords ?? []).slice(0, 2);
  const hiddenTagCount = Math.max((email.keywords?.length ?? 0) - visibleTags.length, 0);
  const hasQuickActions = Boolean(onArchive || onDelete);
  const threadState = email.classification?.status ?? 'open';
  const projectReference = email.classification?.references?.find(
    (reference) => reference.type === 'project'
  );
  const projectSummary = projectReference
    ? getProjectReferenceSummary(projectReference.label)
    : null;

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
          : 'border-border hover:border-foreground/25 hover:shadow-xs',
        isChecked && 'border-primary/70 bg-primary/5 ring-1 ring-primary/20'
      )}
    >
      {isCheckable && (
        <span
          className={cn(
            'absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-md',
            'motion-safe:transition-opacity motion-safe:duration-100',
            isChecked || bulkSelectActive
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
          )}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={(next) => onCheckedChange?.(next === true)}
            aria-label={
              isChecked ? `Deselect email from ${email.senderName}` : `Select email from ${email.senderName}`
            }
          />
        </span>
      )}
      <button
        type="button"
        className={cn(
          'w-full cursor-pointer px-3.5 py-3.5 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          isCheckable && (isChecked || bulkSelectActive) && 'pl-10'
        )}
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
            'mt-2 block truncate text-sm text-foreground',
            email.unread ? 'font-semibold' : 'font-medium'
          )}
        >
          {email.subject}
        </span>

        <span
          className={cn(
            'mt-1.5 line-clamp-2 text-sm leading-5',
            email.unread ? 'text-foreground/80' : 'text-muted-foreground'
          )}
        >
          {email.preview}
        </span>

        {(email.attachmentCount ||
          email.category ||
          visibleTags.length > 0 ||
          threadState ||
          projectReference) && (
          <span className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 pr-16">
            {projectReference && projectSummary && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex max-w-24 items-center gap-1 rounded-sm border border-border bg-muted/35 px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold tabular-nums text-foreground/80"
                    aria-label={`Project ${projectSummary.id}`}
                  >
                    <BriefcaseBusiness aria-hidden="true" className="size-3 shrink-0" />
                    <span className="truncate">{projectSummary.id}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  collisionPadding={12}
                  className="max-w-56 whitespace-normal break-words text-left"
                >
                  <span className="block font-mono text-[0.6875rem] leading-4">
                    {projectSummary.id}
                  </span>
                  {projectSummary.name && (
                    <span className="block text-xs leading-4 opacity-80">
                      {projectSummary.name}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
            {threadState && <EmailThreadStatusPill state={threadState} />}
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

function getProjectReferenceSummary(label: string) {
  const separatorIndex = label.indexOf(' - ');
  if (separatorIndex <= 0) {
    return { id: label, name: null };
  }

  return {
    id: label.slice(0, separatorIndex),
    name: label.slice(separatorIndex + 3),
  };
}
