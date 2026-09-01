import { useEffect, useRef } from 'react';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import type { EmailMeetingEvent, EmailThreadClassification } from '@/modules/email/api';
import { EmailAssigneeAvatar } from '@/modules/email/components/email-assignee-picker';
import {
  EMAIL_THREAD_STATE_LABELS,
  isOpenEmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import { formatEmailDate } from '@/modules/email/lib/email-date';
import { getOutlookAvatarStyle, getOutlookInitials } from '@/modules/email/lib/outlook-avatar';
import { Archive, Flag, Paperclip, Trash2 } from 'lucide-react';

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
  flagged?: boolean;
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
  onToggleFlag?: () => void;
  /**
   * Bulk-selection state (separate from `selected`, which tracks the row
   * currently open in the reading pane). `range` is true when the user held
   * Shift — Outlook-style "select everything between the two ticks".
   */
  isChecked?: boolean;
  /** Undefined disables the bulk-select checkbox entirely. */
  onCheckedChange?: (next: boolean, options?: { range?: boolean }) => void;
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
  onToggleFlag,
  isChecked = false,
  onCheckedChange,
  bulkSelectActive = false,
}: EmailRowCardProps) {
  const isSelected = selected ?? Boolean(email.selected);
  const isCheckable = Boolean(onCheckedChange);
  const cardRef = useRef<HTMLElement>(null);
  // Whether Shift was held when the checkbox was pressed — read back when the
  // checked state actually changes so range selection can kick in.
  const shiftClickRef = useRef(false);
  const isOtherClassified = (email.classification?.references ?? []).some(
    (reference) => reference.type === 'other'
  );
  const hasQuickActions = Boolean(onArchive || onDelete || onToggleFlag);
  const threadState = email.classification?.status ?? 'open';
  const projectReferences = (email.classification?.references ?? []).filter(
    (reference) => reference.type === 'project'
  );
  const primaryProject = projectReferences[0];
  const extraProjectCount = projectReferences.length - 1;
  const showCheckbox = isChecked || bulkSelectActive;

  useEffect(() => {
    if (!isSelected) return;

    cardRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [isSelected]);

  return (
    <article
      ref={cardRef}
      className={cn(
        'group relative mx-1 mt-1.5 overflow-hidden rounded-md border bg-background',
        'motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-100',
        isSelected
          ? 'border-info/60 bg-info-soft shadow-sm ring-1 ring-info/25'
          : 'border-border hover:border-foreground/25 hover:shadow-xs',
        isChecked && !isSelected && 'border-info/50 bg-info-soft/50 ring-1 ring-info/20',
        // Unread rows carry a solid accent bar on the leading edge.
        email.unread && 'border-s-4 border-s-primary'
      )}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer gap-2.5 px-3 py-2.5 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
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
        <SenderAvatar
          name={email.senderName}
          className={cn(
            'motion-safe:transition-opacity motion-safe:duration-100',
            showCheckbox && 'opacity-0'
          )}
        />

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'min-w-0 truncate text-sm text-foreground',
                email.unread ? 'font-semibold' : 'font-medium'
              )}
            >
              {email.senderName}
            </span>
            {email.threadMessageCount && email.threadMessageCount > 1 && (
              <span
                className="shrink-0 text-xs text-muted-foreground"
                title={`${email.threadMessageCount} messages in this thread`}
              >
                ({email.threadMessageCount})
              </span>
            )}
            {Boolean(email.attachmentCount) && (
              <span
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                title={`${email.attachmentCount} ${email.attachmentCount === 1 ? 'attachment' : 'attachments'}`}
              >
                <span aria-hidden="true">·</span>
                <Paperclip aria-hidden="true" className="size-3" strokeWidth={1.8} />
                {email.attachmentCount}
              </span>
            )}
            <span className="ms-auto flex shrink-0 items-center gap-1.5">
              <span
                className={cn(
                  'whitespace-nowrap text-[11px] leading-none',
                  email.unread ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
                title={email.receivedAt}
              >
                {formatEmailDate(email.receivedAt)}
              </span>
            </span>
          </span>

          <span
            className={cn(
              'mt-0.5 block truncate pe-20 text-sm text-foreground',
              email.unread ? 'font-semibold' : 'font-medium'
            )}
          >
            {email.subject}
          </span>

          <span
            className={cn(
              'mt-0.5 line-clamp-1 text-sm leading-5',
              email.unread ? 'text-foreground/80' : 'text-muted-foreground'
            )}
          >
            {email.preview}
          </span>

          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            {isOtherClassified && (
              <span className="rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
                Other
              </span>
            )}
            {email.classification?.assignedTo && (
              <EmailAssigneeAvatar assignee={email.classification.assignedTo} />
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold',
                isOpenEmailThreadState(threadState)
                  ? 'text-destructive'
                  : 'text-success-soft-foreground'
              )}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {EMAIL_THREAD_STATE_LABELS[threadState]}
            </span>
            {email.flagged && (
              <Flag
                aria-label="Flagged"
                className="size-3.5 shrink-0 fill-destructive text-destructive"
                strokeWidth={1.8}
              />
            )}
          </span>

          {primaryProject && (
            <span className="mt-1.5 flex min-w-0 items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex max-w-48 items-center rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold uppercase tabular-nums text-foreground/80"
                    aria-label={`Project ${primaryProject.label}`}
                  >
                    <span className="truncate">{primaryProject.label}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  variant="light"
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  collisionPadding={12}
                  className="z-60 max-w-64 whitespace-normal break-words text-left font-medium"
                >
                  {primaryProject.label}
                </TooltipContent>
              </Tooltip>
              {extraProjectCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0 cursor-default rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
                      +{extraProjectCount}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    variant="light"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    className="z-60 max-w-64 p-1.5"
                  >
                    <span className="flex flex-col gap-1">
                      {projectReferences.slice(1).map((reference) => (
                        <span
                          key={reference.entityId ?? reference.label}
                          className="block whitespace-normal break-words rounded-sm border border-border bg-muted/40 px-1.5 py-1 text-left font-mono text-[0.6875rem] font-semibold uppercase tabular-nums text-foreground/80"
                        >
                          {reference.label}
                        </span>
                      ))}
                    </span>
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
          )}
        </span>
      </button>

      {isCheckable && (
        <span
          className={cn(
            'absolute left-3 top-2.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full',
            'motion-safe:transition-opacity motion-safe:duration-100',
            showCheckbox
              ? 'opacity-100'
              : 'bg-background opacity-0 hover:opacity-100 focus-within:opacity-100'
          )}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            shiftClickRef.current = event.shiftKey;
            event.stopPropagation();
          }}
        >
          <Checkbox
            className="size-5 cursor-pointer rounded-md"
            checked={isChecked}
            onCheckedChange={(next) => {
              onCheckedChange?.(next === true, { range: shiftClickRef.current });
              shiftClickRef.current = false;
            }}
            aria-label={
              isChecked
                ? `Deselect email from ${email.senderName}`
                : `Select email from ${email.senderName}`
            }
          />
        </span>
      )}

      {hasQuickActions && (
        <div className="absolute right-3 top-8 z-10 flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-xs opacity-100 lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-100">
          {onToggleFlag && (
            <QuickAction
              label={email.flagged ? `Unflag ${email.subject}` : `Flag ${email.subject}`}
              title={email.flagged ? 'Unflag' : 'Flag'}
              pressed={email.flagged ?? false}
              tone="destructive"
              onActivate={onToggleFlag}
            >
              <Flag
                aria-hidden="true"
                className={cn('size-3.5', email.flagged && 'fill-destructive text-destructive')}
              />
            </QuickAction>
          )}
          {onArchive && (
            <QuickAction label={`Archive ${email.subject}`} title="Archive" onActivate={onArchive}>
              <Archive aria-hidden="true" className="size-3.5" />
            </QuickAction>
          )}
          {onDelete && (
            <QuickAction
              label={`Delete ${email.subject}`}
              title="Delete"
              tone="destructive"
              onActivate={onDelete}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </QuickAction>
          )}
        </div>
      )}
    </article>
  );
}

function QuickAction({
  label,
  title,
  pressed,
  tone = 'info',
  onActivate,
  children,
}: {
  label: string;
  title: string;
  pressed?: boolean;
  tone?: 'destructive' | 'info';
  onActivate: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px motion-safe:transition-colors motion-safe:duration-100',
        tone === 'destructive'
          ? 'hover:bg-destructive/10 hover:text-destructive'
          : 'hover:bg-info-soft hover:text-info'
      )}
      aria-label={label}
      aria-pressed={pressed}
      title={title}
      onClick={(event) => {
        // Release focus so group-focus-within doesn't pin the hover cluster open.
        event.currentTarget.blur();
        onActivate();
      }}
    >
      {children}
    </button>
  );
}

function SenderAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        className
      )}
      // Exact Outlook avatar colours — see outlook-avatar.ts.
      style={getOutlookAvatarStyle(name)}
    >
      {getOutlookInitials(name) || '?'}
    </span>
  );
}
