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
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { useShowEmailAvatars } from '@/modules/email/hooks/use-email-avatar-visibility';
import { formatEmailListDate } from '@/modules/email/lib/email-date';
import {
  getMeetingResponseLabel,
  MEETING_RESPONSE_ICONS,
} from '@/modules/email/lib/email-meeting-response';
import { cleanEmailPreview } from '@/modules/email/lib/email-preview-text';
import { emailRowCorrespondent } from '@/modules/email/lib/email-row-correspondent';
import { emailRowSurfaceClasses } from '@/modules/email/lib/email-row-surface';
import { Archive, Flag, Paperclip, Pin, PinOff, Trash2 } from 'lucide-react';

export type EmailListItem = {
  id: string;
  latestMessageId?: string;
  providerId?: string;
  threadId?: string | null;
  conversationKey?: string;
  senderName: string;
  senderEmail: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientCount?: number;
  subject: string;
  preview: string;
  receivedAt: string;
  folderId?: string | null;
  folder: string;
  /** The server's well-known folder key; `folder` may hold the folder id. */
  folderKey?: string;
  mailbox: string;
  unread: boolean;
  flagged?: boolean;
  /** Provider categories mirrored from Outlook/Gmail. Read-only. */
  keywords?: string[];
  /** Elli's own tags applied to this message. */
  tags?: string[];
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
  tags?: string[];
  meetingResponse?: EmailMeetingResponse;
  meetingEvent?: EmailMeetingEvent;
  deliveryStatus?: 'sending' | 'failed' | 'sent';
  body: string[];
  /**
   * The server left this message's body out because the conversation was too
   * large to send whole; the card fetches it when the reader expands it. Set
   * only on the outliers — see `conversation-bodies.ts` in elli-core.
   */
  bodyPending?: boolean;
  /**
   * The provider's own snippet, sent in place of a deferred body so the
   * collapsed card still has a line to show.
   */
  preview?: string;
  attachments?: EmailAttachment[];
};

/**
 * Fades an element out where the quick-action cluster takes its slot —
 * the avatar and the timestamp both hide this way, so the icons underneath
 * read clearly instead of stacking on top of them.
 */
const FADES_FOR_QUICK_ACTIONS =
  'max-lg:opacity-0 lg:group-hover:opacity-0 lg:group-focus-within:opacity-0';

/** Escapes regex metacharacters so a search query can be used as a literal match. */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wraps case-insensitive matches of `query` in `text` with a `<mark>`. */
function highlightText(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, 'gi'));
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={index} className="rounded-xs bg-warning-soft text-warning-soft-foreground">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

interface EmailRowCardProps {
  email: EmailListItem;
  accountId?: string;
  selected?: boolean;
  /** Search term to highlight within the subject/preview text. */
  highlightQuery?: string;
  onSelect?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onToggleFlag?: () => void;
  /** Omit where pinning does not apply (search results, the pinned group's own rows still pass it). */
  onTogglePin?: () => void;
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

/**
 * One conversation in the list.
 *
 * Redrawn for elli-ui#921: the row sits directly on the mail paper with no
 * border of its own, and only the open conversation lifts onto a white card.
 * A list of forty bordered boxes reads as forty things to deal with; a list of
 * forty lines with one card in it reads as a list with your place kept in it.
 *
 * Four fixed lines — participants, subject, one line of preview, a footer —
 * so every row is the same height and the column scans as a column.
 */
export function EmailRowCard({
  email,
  accountId,
  selected,
  highlightQuery,
  onSelect,
  onArchive,
  onDelete,
  onToggleFlag,
  onTogglePin,
  isChecked = false,
  onCheckedChange,
  bulkSelectActive = false,
}: EmailRowCardProps) {
  const isSelected = selected ?? Boolean(email.selected);
  const isCheckable = Boolean(onCheckedChange);
  const showAvatars = useShowEmailAvatars();
  const cardRef = useRef<HTMLElement>(null);
  // Whether Shift was held when the checkbox was pressed — read back when the
  // checked state actually changes so range selection can kick in.
  const shiftClickRef = useRef(false);
  const isOtherClassified = (email.classification?.references ?? []).some(
    (reference) => reference.type === 'other'
  );
  const isPinned = Boolean(email.classification?.pinnedAt);
  const hasQuickActions = Boolean(onArchive || onDelete || onToggleFlag || onTogglePin);
  // Sender in the Inbox, `To: …` in Sent and Drafts — see the helper.
  const correspondent = emailRowCorrespondent(email);
  const threadState = email.classification?.status ?? 'open';
  const projectReferences = (email.classification?.references ?? []).filter(
    (reference) => reference.type === 'project'
  );
  const primaryProject = projectReferences[0];
  const extraProjectCount = projectReferences.length - 1;
  const showCheckbox = isChecked || bulkSelectActive;
  // Outlook mails the organiser an "Accepted: <meeting>" notification with an
  // empty body, so the row would otherwise be a subject over a blank line with
  // nothing saying who accepted (zubblehq/elli-ui#876). Say it where the
  // preview would have been, in the wording the thread strip uses.
  // Stripped of the horizontal rules the provider's plain-text flattening
  // leaves behind, which the mailbox row was drawing as trailing underscores.
  const preview = cleanEmailPreview(email.preview);
  const meetingResponse = preview ? undefined : email.meetingResponse;
  const MeetingResponseIcon = meetingResponse
    ? MEETING_RESPONSE_ICONS[meetingResponse.status]
    : null;
  const threadCount = email.threadMessageCount ?? 0;
  const hasFooter = Boolean(
    email.attachmentCount ||
    email.flagged ||
    isPinned ||
    isOtherClassified ||
    primaryProject ||
    email.classification?.assignedTo ||
    email.classification
  );

  useEffect(() => {
    if (!isSelected) return;

    cardRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [isSelected]);

  return (
    <article
      ref={cardRef}
      aria-selected={isSelected}
      className="group relative mx-3 mb-1 rounded-[10px]"
    >
      <button
        type="button"
        className={cn(
          'flex w-full cursor-pointer gap-[11px] rounded-[10px] px-2.5 py-[13px] text-left',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          'motion-safe:transition-[background-color,box-shadow] motion-safe:duration-100',
          ...emailRowSurfaceClasses({ isSelected, isChecked })
        )}
        aria-current={isSelected ? 'true' : undefined}
        aria-label={`${correspondent.fullLabel}: ${email.subject}, ${email.unread ? 'unread' : 'read'}${
          email.attachmentCount
            ? `, ${email.attachmentCount} ${email.attachmentCount === 1 ? 'attachment' : 'attachments'}`
            : ''
        }`}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button === 0) onSelect?.();
        }}
        onClick={(event) => {
          const pointerType = (event.nativeEvent as PointerEvent).pointerType;
          if (pointerType === 'mouse' && event.detail > 0) return;
          onSelect?.();
        }}
      >
        {showAvatars ? (
          <SenderAvatar
            name={correspondent.name}
            email={correspondent.email}
            accountId={accountId}
            className={cn(
              'mt-px size-9 text-xs',
              // Read conversations sit back a step, so the column has rhythm.
              !email.unread && 'saturate-50 brightness-[1.03]',
              'motion-safe:transition-opacity motion-safe:duration-100',
              showCheckbox && 'opacity-0'
            )}
          />
        ) : (
          isCheckable && (
            <span
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center self-start"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => {
                shiftClickRef.current = event.shiftKey;
                event.stopPropagation();
              }}
            >
              <Checkbox
                className="size-4 cursor-pointer rounded-md"
                checked={isChecked}
                onCheckedChange={(next) => {
                  onCheckedChange?.(next === true, { range: shiftClickRef.current });
                  shiftClickRef.current = false;
                }}
                aria-label={
                  isChecked
                    ? `Deselect ${correspondent.fullLabel}`
                    : `Select ${correspondent.fullLabel}`
                }
              />
            </span>
          )
        )}

        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'min-w-0 truncate text-[12.5px]',
                email.unread ? 'font-semibold text-mail-ink' : 'font-medium text-mail-mid'
              )}
            >
              {/* The name is as likely to be what was searched for as the
                  subject or the body — searching a company name and seeing the
                  match lit in the preview but not in the name it came from
                  reads as the wrong row matching (elli-ui#1022). */}
              {highlightQuery
                ? highlightText(correspondent.label, highlightQuery)
                : correspondent.label}
            </span>
            {correspondent.othersCount > 0 && (
              <span
                className="shrink-0 text-[11.5px] tabular-nums text-mail-muted"
                title={`${correspondent.othersCount + 1} recipients`}
              >
                +{correspondent.othersCount}
              </span>
            )}
            {threadCount > 1 && (
              <span
                className="shrink-0 text-[11.5px] tabular-nums text-mail-muted"
                title={`${threadCount} messages in this thread`}
              >
                ({threadCount})
              </span>
            )}
            {/*
              Who holds the thread, beside when it arrived.
              It used to sit in the footer at `size-4` with 8px initials,
              between the flag and the paperclip — too small to read and
              reading as one more status glyph rather than a person
              (elli-ui#991). Up here it is next to the only other
              per-conversation fact on the row, and the footer is left to
              status.
            */}
            {/*
              A fixed-size slot, always in the DOM, so assigning or
              unassigning the thread never changes the row's width — only
              what is painted inside the slot changes (elli-ui#1091). Mounting
              and unmounting the avatar itself was the shift: the flex row's
              content width — and so the `ms-auto` gap before it — jumped the
              moment the picker resolved.
            */}
            <span className="ms-auto flex size-5 shrink-0 items-center justify-center">
              {email.classification?.assignedTo && (
                <EmailAssigneeAvatar
                  accountId={accountId}
                  assignee={email.classification.assignedTo}
                  className={cn(
                    'size-5 text-[10px]',
                    'motion-safe:transition-opacity motion-safe:duration-100',
                    hasQuickActions && FADES_FOR_QUICK_ACTIONS
                  )}
                />
              )}
            </span>
            {/*
              The quick actions take the timestamp's own slot rather than
              floating over the subject and preview below (elli-ui#1091). The
              timestamp stays mounted and merely fades out, so this span's
              width and the row's height never change between the two states
              — nothing downstream has to reserve space or reflow for it.
            */}
            <span className="relative shrink-0">
              <span
                className={cn(
                  'block whitespace-nowrap text-[11px] tabular-nums text-mail-muted',
                  'motion-safe:transition-opacity motion-safe:duration-100',
                  hasQuickActions && FADES_FOR_QUICK_ACTIONS
                )}
                title={email.receivedAt}
              >
                {formatEmailListDate(email.receivedAt)}
              </span>
              {hasQuickActions && (
                <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 opacity-100 lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-100">
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
                        className={cn(
                          'size-3.5',
                          email.flagged && 'fill-destructive text-destructive'
                        )}
                      />
                    </QuickAction>
                  )}
                  {onTogglePin && (
                    <QuickAction
                      label={isPinned ? `Unpin ${email.subject}` : `Pin ${email.subject}`}
                      title={isPinned ? 'Unpin' : 'Pin to top'}
                      pressed={isPinned}
                      onActivate={onTogglePin}
                    >
                      {isPinned ? (
                        <PinOff aria-hidden="true" className="size-3.5 -rotate-45" />
                      ) : (
                        <Pin aria-hidden="true" className="size-3.5 -rotate-45" />
                      )}
                    </QuickAction>
                  )}
                  {onArchive && (
                    <QuickAction
                      label={`Archive ${email.subject}`}
                      title="Archive"
                      onActivate={onArchive}
                    >
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
            </span>
          </span>

          <span
            className={cn(
              'block truncate text-sm leading-[1.35] tracking-[-0.008em]',
              email.unread ? 'font-bold text-mail-unread' : 'font-medium text-mail-ink'
            )}
          >
            {highlightQuery ? highlightText(email.subject, highlightQuery) : email.subject}
          </span>

          <span className="mt-0.5 block truncate text-[12.5px] leading-[1.45] text-mail-muted">
            {meetingResponse && MeetingResponseIcon ? (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 align-bottom">
                <MeetingResponseIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                  strokeWidth={1.8}
                />
                <span className="truncate">{getMeetingResponseLabel(meetingResponse)}</span>
              </span>
            ) : highlightQuery ? (
              highlightText(preview, highlightQuery)
            ) : (
              preview
            )}
          </span>

          {hasFooter && (
            <span className="mt-[9px] flex min-w-0 items-center gap-[7px]">
              {email.classification && (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold',
                    isOpenEmailThreadState(threadState)
                      ? 'text-destructive'
                      : 'text-success-soft-foreground'
                  )}
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {EMAIL_THREAD_STATE_LABELS[threadState]}
                </span>
              )}
              {isOtherClassified && (
                <span className="shrink-0 rounded-sm bg-mail-chip px-1.5 py-0.5 text-[10.5px] font-semibold text-mail-mid">
                  Other
                </span>
              )}
              {primaryProject && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex min-w-0 max-w-40 items-center rounded-sm bg-mail-chip px-1.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tabular-nums text-mail-mid"
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
                    {projectReferences.map((reference) => reference.label).join(', ')}
                  </TooltipContent>
                </Tooltip>
              )}
              {extraProjectCount > 0 && (
                <span className="shrink-0 text-[10.5px] font-semibold text-mail-muted">
                  +{extraProjectCount}
                </span>
              )}
              {email.flagged && (
                <Flag
                  aria-label="Flagged"
                  className="size-3 shrink-0 fill-destructive text-destructive"
                  strokeWidth={1.8}
                />
              )}
              {/*
                The pushpin, tilted and filled, the way every mail client
                draws a pinned item — that tilt is what makes it read as a pin
                rather than as a map marker at 12px (elli-ui#1034). The glyph
                is the convention; the colour is ours, the same accent the rest
                of the mailbox uses, not Outlook's blue.
              */}
              {isPinned && (
                <Pin
                  aria-label="Pinned"
                  className="size-3 shrink-0 -rotate-45 fill-mail-accent text-mail-accent"
                  strokeWidth={1.8}
                />
              )}
              {Boolean(email.attachmentCount) && (
                <span
                  className={cn(
                    'ms-auto inline-flex shrink-0 items-center gap-[3px] text-[11px] tabular-nums text-mail-muted'
                  )}
                >
                  <Paperclip className="size-[11px]" strokeWidth={1.7} />
                  {email.attachmentCount}
                </span>
              )}
            </span>
          )}
        </span>
      </button>

      {isCheckable && showAvatars && (
        <span
          className={cn(
            'absolute left-2.5 top-[13px] z-10 flex size-9 cursor-pointer items-center justify-center rounded-full',
            'motion-safe:transition-opacity motion-safe:duration-100',
            showCheckbox
              ? 'opacity-100'
              : 'bg-mail-paper opacity-0 hover:opacity-100 focus-within:opacity-100'
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
                ? `Deselect ${correspondent.fullLabel}`
                : `Select ${correspondent.fullLabel}`
            }
          />
        </span>
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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex size-7 cursor-pointer items-center justify-center rounded-md text-mail-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px motion-safe:transition-colors motion-safe:duration-100',
            tone === 'destructive'
              ? 'hover:bg-destructive/10 hover:text-destructive'
              : 'hover:bg-mail-accent-soft hover:text-mail-accent'
          )}
          aria-label={label}
          aria-pressed={pressed}
          onClick={(event) => {
            // Release focus so group-focus-within doesn't pin the hover cluster open.
            event.currentTarget.blur();
            onActivate();
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent variant="light" side="bottom" sideOffset={6}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
