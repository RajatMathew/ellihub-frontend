import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Checkbox } from '@/app/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { SEARCH_HIGHLIGHT_CLASS } from '@/app/lib/search-highlight';
import { cn } from '@/app/lib/utils';
import type { EmailMeetingEvent, EmailThreadClassification } from '@/modules/email/api';
import { EmailAssigneeAvatar } from '@/modules/email/components/email-assignee-picker';
import {
  EMAIL_THREAD_STATE_LABELS,
  emailThreadStateTone,
  isEmailThreadStateSet,
  resolveEmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import { EmailRowActionIcon } from '@/modules/email/components/email-row-action-icon';
import { EmailRowAttachmentTiles } from '@/modules/email/components/email-row-attachment-tiles';
import { EmailRowLinkedItems } from '@/modules/email/components/email-row-linked-items';
import { EmailRowSwipeActions } from '@/modules/email/components/email-row-swipe-actions';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { useShowEmailAvatars } from '@/modules/email/hooks/use-email-avatar-visibility';
import { formatEmailListDate } from '@/modules/email/lib/email-date';
import {
  getMeetingResponseLabel,
  MEETING_RESPONSE_ICONS,
} from '@/modules/email/lib/email-meeting-response';
import { cleanEmailPreview } from '@/modules/email/lib/email-preview-text';
import { emailRowActions } from '@/modules/email/lib/email-row-actions';
import { selectEmailRowAttachmentTiles } from '@/modules/email/lib/email-row-attachments';
import { emailRowCorrespondent } from '@/modules/email/lib/email-row-correspondent';
import { emailRowSurfaceClasses } from '@/modules/email/lib/email-row-surface';
import { Flag, Paperclip, Pin } from 'lucide-react';

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
  /** The row has a file even when `attachmentCount` is not known yet. */
  hasAttachments?: boolean;
  /** This message's own files — the latest in the conversation. */
  attachmentCount?: number;
  /** Any message in the conversation has a file; what the row's paperclip shows. */
  threadHasAttachments?: boolean;
  threadAttachmentCount?: number;
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
 * The `+2` others-count and `(3)` thread-count chips beside the name.
 * `-ms-0.5` pulls each in from the row's own `gap-1.5` so it reads as part
 * of the name, not as its own item on the line.
 */
const NAME_COUNT_CHIP_CLASSES = '-ms-0.5 shrink-0 text-[11.5px] tabular-nums text-mail-muted';

/**
 * When the row's icon buttons take the timestamp's place on the name line.
 *
 * Under a mouse: while the row is hovered or holds focus. A touch screen has
 * no hover, and the buttons used to be shown always there instead — so a phone
 * never said when a mail arrived, which is the one thing the name line is for.
 * A finger reaches the same actions by swiping the row open
 * (`EmailRowSwipeActions`), so on touch the buttons now appear only for
 * keyboard focus: a tablet with a keyboard attached still tabs into them.
 * `:focus-visible`, not `:focus-within`, because a tap focuses the row on
 * Android and would otherwise swap the time back out on the row just opened.
 *
 * `group-hover` needs no pointer gate of its own: Tailwind only emits it under
 * `@media (hover: hover)`.
 */
const QUICK_ACTIONS_REVEAL = {
  /** On the timestamp, which leaves the flow. */
  hide: 'group-hover:hidden not-pointer-coarse:group-focus-within:hidden pointer-coarse:group-has-focus-visible:hidden',
  /** On the assignee avatar, which keeps its slot and fades. */
  fade: 'group-hover:opacity-0 not-pointer-coarse:group-focus-within:opacity-0 pointer-coarse:group-has-focus-visible:opacity-0',
  /** On the buttons themselves. */
  show: 'group-hover:flex not-pointer-coarse:group-focus-within:flex pointer-coarse:group-has-focus-visible:flex',
};

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
      <mark key={index} className={SEARCH_HIGHLIGHT_CLASS}>
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
  /** Archive folder only: moves the conversation back to the Inbox. */
  onUnarchive?: () => void;
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
  /** Opens one of the row's files in the mailbox's preview dialog. */
  onOpenAttachment?: (attachment: EmailAttachment) => void;
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
 * so every row is the same height and the column scans as a column. A row
 * with files adds one more, a strip naming them (`EmailRowAttachmentTiles`),
 * which is itself one line whatever the count; the virtualised list measures
 * each row, so the taller ones cost nothing but their height.
 */
export function EmailRowCard({
  email,
  accountId,
  selected,
  highlightQuery,
  onSelect,
  onArchive,
  onUnarchive,
  onDelete,
  onToggleFlag,
  onTogglePin,
  isChecked = false,
  onCheckedChange,
  bulkSelectActive = false,
  onOpenAttachment,
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
  const actions = emailRowActions(
    { subject: email.subject, flagged: email.flagged ?? false, pinned: isPinned },
    { onToggleFlag, onTogglePin, onArchive, onUnarchive, onDelete }
  );
  const hasQuickActions = actions.length > 0;
  // Sender in the Inbox, `To: …` in Sent and Drafts — see the helper.
  const correspondent = emailRowCorrespondent(email);
  const threadState = resolveEmailThreadState(email.classification?.status);
  // Every record the thread is linked to, not only its jobs — the row draws
  // them as the task card does, jobs first (see EmailRowLinkedItems).
  const linkedReferences = (email.classification?.references ?? []).filter(
    (reference) => reference.type !== 'other'
  );
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
  // A shared-mailbox row can know it has a file before it knows how many
  // (elli-core lists them after the sync that raised the flag). Draw the clip
  // from the flag and the number only once there is one.
  //
  // The conversation's, not the latest message's: a thread whose newest reply
  // carries no file still has the files of every reply before it.
  const attachmentCount = email.threadAttachmentCount ?? email.attachmentCount;
  const hasAttachments = Boolean(
    attachmentCount || email.threadHasAttachments || email.hasAttachments
  );
  // The paperclip is for a row that cannot name its files: one from an API
  // without the list, or one whose only files are inline. A row with tiles
  // says what it has; the clip's count beside them was one number too many.
  const showsAttachmentTiles = selectEmailRowAttachmentTiles(email.attachments).tiles.length > 0;
  const hasLinkedItems = linkedReferences.length > 0;
  // Anything drawn on a strip after the row's button takes over the row's
  // bottom padding — see the strips below.
  const hasStrip = showsAttachmentTiles || hasLinkedItems;
  // Aligned under the text column: the row's inset plus whatever sits in the
  // leading slot — the avatar, the checkbox, or nothing.
  const stripInset = cn('pe-2.5', showAvatars ? 'ps-[57px]' : isCheckable ? 'ps-[41px]' : 'ps-2.5');
  // A strip sits outside the row's button, so the space around what it holds
  // would otherwise be a dead patch of the card. A press there opens the mail
  // the way the rest of the row does; a press on a button in it is left to the
  // button. Mouse-only on pointerdown: the row's button already carries the
  // keyboard and screen-reader path.
  const stripPressHandlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest('button')) return;
      if (event.pointerType === 'mouse' && event.button === 0) onSelect?.();
    },
    onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest('button')) return;
      const pointerType = (event.nativeEvent as PointerEvent).pointerType;
      if (pointerType === 'mouse' && event.detail > 0) return;
      onSelect?.();
    },
  };
  const attachmentClip = hasAttachments ? (
    <span className="ms-auto inline-flex shrink-0 items-center gap-[3px] text-[11px] tabular-nums text-mail-muted">
      <Paperclip className="size-[11px]" strokeWidth={1.7} />
      {attachmentCount ? attachmentCount : null}
    </span>
  ) : null;
  // Every row carries a `classification` object — the API fills the absence in
  // with an empty one — so testing for it drew the footer on all of them. With
  // the court no longer printed until someone sets it, an unfiled row would
  // reserve a line for nothing. Each term here is something the footer renders.
  const hasFooter = Boolean(
    (hasAttachments && !showsAttachmentTiles) ||
    email.flagged ||
    isPinned ||
    isOtherClassified ||
    email.classification?.assignedTo ||
    isEmailThreadStateSet(threadState)
  );

  // `block: 'nearest'` scrolls the least it can get away with, which parks the
  // row flush against whichever edge it came in from — and both edges of the
  // list are covered. The scroll margins below are what hold it clear; see the
  // class on the <article>.
  useEffect(() => {
    if (!isSelected) return;

    cardRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [isSelected]);

  return (
    <article
      ref={cardRef}
      aria-selected={isSelected}
      // The scroll margins are for keyboard navigation (elli-ui#1237). Arrowing
      // onto a row scrolls it in with `block: 'nearest'`, which stops the
      // moment the row is technically inside the scrollport — and the
      // scrollport's own edges are both covered: the list fades out into the
      // paper over the bottom 56px, and a month header sticks to the top. So
      // the newly-opened mail arrived half-dissolved into the fade, or tucked
      // under "This week". `scroll-mb`/`scroll-mt` grow the box the browser
      // scrolls to without moving the box it paints, so the row lands clear of
      // both — no measuring, and it stays right if either chrome changes.
      className="group relative mx-3 mb-1 scroll-mb-16 scroll-mt-10 rounded-[10px]"
    >
      <EmailRowSwipeActions
        disabled={bulkSelectActive}
        actions={actions}
        className="rounded-[10px]"
      >
        {/*
          The surface is painted here, over the row's button and the strip of
          file tiles beside it, so the two read as one card. The tiles are real
          buttons and cannot live inside the row's own button, so the row's
          bottom padding moves to the strip when there is one.
        */}
        <div
          className={cn(
            'rounded-[10px]',
            'motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200',
            ...emailRowSurfaceClasses({ isSelected, isChecked })
          )}
        >
          <button
            type="button"
            className={cn(
              'flex w-full cursor-pointer gap-[11px] rounded-[10px] px-2.5 pt-[13px] text-left',
              hasStrip ? 'pb-0' : 'pb-[13px]',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
            )}
            aria-current={isSelected ? 'true' : undefined}
            aria-label={`${correspondent.fullLabel}: ${email.subject}, ${email.unread ? 'unread' : 'read'}${
              attachmentCount
                ? `, ${attachmentCount} ${attachmentCount === 1 ? 'attachment' : 'attachments'}`
                : hasAttachments
                  ? ', has attachments'
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
                  showCheckbox && 'opacity-0',
                  // Fades on the same trigger as the checkbox circle it swaps
                  // for below — otherwise the two could disagree about whether
                  // hover counted and briefly show through each other. Hover
                  // only, not focus-within: the tick is a mouse affordance, and
                  // keyboard focus landing anywhere in the row (a quick action,
                  // the subject link) shouldn't swap the avatar out from under it.
                  isCheckable && 'group-hover:opacity-0'
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
                    // No `max-w-*` guess and no `flex-1`: default flex sizing
                    // (`shrink: 1`, `grow: 0`) already truncates this exactly
                    // when the row's total content — name plus whatever the
                    // quick-action cluster takes on hover — exceeds the column
                    // width, on any column width, without a pixel guess. A
                    // `flex-1` here stretched the name's own box to fill leftover
                    // room, opening a gap before the next chip even when the
                    // name was short (elli-ui#1091 follow-up).
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
                    className={NAME_COUNT_CHIP_CLASSES}
                    title={`${correspondent.othersCount + 1} recipients`}
                  >
                    +{correspondent.othersCount}
                  </span>
                )}
                {threadCount > 1 && (
                  <span
                    className={NAME_COUNT_CHIP_CLASSES}
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
                        // Fades out once the quick-action cluster is showing, so
                        // it doesn't compete for attention right beside the
                        // icons.
                        hasQuickActions && QUICK_ACTIONS_REVEAL.fade
                      )}
                    />
                  )}
                </span>
                {/*
              The quick actions replace the timestamp in the flex row rather
              than floating over it (elli-ui#1091 follow-up): only one of the
              two is ever in flow, so the sibling `flex-1` name above always
              knows the real amount of room it has and shrinks to exactly
              fit — no overlap, on any column width, without guessing a
              pixel value. The trade-off this reopens is the one #1091 was
              written to avoid: the row's own content briefly reflows the
              instant hover starts. The negative margin below still keeps
              the taller buttons from growing the row's height.
            */}
                <span className="shrink-0">
                  <span
                    className={cn(
                      'block whitespace-nowrap text-[11px] tabular-nums text-mail-muted',
                      hasQuickActions && QUICK_ACTIONS_REVEAL.hide
                    )}
                    title={email.receivedAt}
                  >
                    {formatEmailListDate(email.receivedAt)}
                  </span>
                  {hasQuickActions && (
                    <div
                      className={cn('-my-1 hidden items-center gap-0.5', QUICK_ACTIONS_REVEAL.show)}
                    >
                      {actions.map((action) => (
                        <QuickAction
                          key={action.key}
                          label={action.label}
                          title={action.tooltip}
                          pressed={action.pressed}
                          // The flag is red when set, so it warms to red too.
                          tone={
                            action.destructive || action.key === 'flag' ? 'destructive' : 'info'
                          }
                          onActivate={action.run}
                        >
                          <EmailRowActionIcon action={action} className="size-3.5" />
                        </QuickAction>
                      ))}
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
                  {/* A court nobody has set draws nothing. The row is read-only —
                    there is no setting a court from here — so a "Set court"
                    label on it would be an instruction the reader cannot
                    follow, printed on every unfiled message in the mailbox.
                    The footer already renders each of its chips only when
                    there is one. */}
                  {isEmailThreadStateSet(threadState) && (
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold',
                        emailThreadStateTone(threadState) === 'closed'
                          ? 'text-success-soft-foreground'
                          : 'text-destructive'
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
                  {!showsAttachmentTiles && attachmentClip}
                </span>
              )}
            </span>
          </button>
          {/* The linked records' strip — outside the button for the same
              reason as the tiles: its "+N more" is a real button. */}
          {hasLinkedItems && (
            <div
              className={cn(
                stripInset,
                'pt-2',
                showsAttachmentTiles ? 'pb-0' : 'pb-[13px]',
                'cursor-pointer'
              )}
              {...stripPressHandlers}
            >
              <EmailRowLinkedItems references={linkedReferences} />
            </div>
          )}
          {showsAttachmentTiles && (
            <div className={cn(stripInset, 'pb-[13px]', 'cursor-pointer')} {...stripPressHandlers}>
              <EmailRowAttachmentTiles attachments={email.attachments} onOpen={onOpenAttachment} />
            </div>
          )}
        </div>
      </EmailRowSwipeActions>

      {isCheckable && showAvatars && (
        <span
          className={cn(
            'absolute left-2.5 top-[13px] z-10 flex size-9 cursor-pointer items-center justify-center rounded-full',
            'motion-safe:transition-opacity motion-safe:duration-100',
            showCheckbox
              ? 'pointer-events-auto opacity-100'
              : // `group-hover` (the row), not this span's own `hover` (its
                // 36px circle only) — the two used to fire on different
                // triggers, so there was a window where the avatar
                // underneath was still visible while this was fading in.
                // No backdrop fill: the avatar it swaps for fades out on the
                // same trigger (above), so there's nothing left to cover.
                // Hover only — see the avatar's own comment for why
                // focus-within doesn't also show it.
                //
                // `pointer-events-none` until that hover: `opacity-0` still
                // takes clicks, and this 36px circle sits above the row on
                // `z-10`, outside the swipe wrapper. A touch device never
                // hovers, so the invisible checkbox was eating every tap that
                // landed on the avatar — the left edge of every row was a
                // dead zone that silently did nothing (elli-ui#1073).
                'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
          )}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            shiftClickRef.current = event.shiftKey;
            event.stopPropagation();
          }}
        >
          <Checkbox
            size="lg"
            className="cursor-pointer rounded-md"
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
    // These four sit right under the cursor the instant the row is hovered,
    // so the shared tooltip's instant-open default (`delayDuration={0}`,
    // `src/app/components/ui/tooltip.tsx`) fired one for every icon the
    // pointer crossed on the way to the one actually meant. A short delay
    // means only a deliberate pause gets a tooltip.
    <Tooltip delayDuration={400}>
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
      <TooltipContent variant="light" side="top" sideOffset={6}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
