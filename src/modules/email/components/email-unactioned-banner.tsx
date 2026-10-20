import { useId, useState } from 'react';

import { cn } from '@/app/lib/utils';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { formatOpenedAgo, type UnactionedEmail } from '@/modules/email/lib/email-unactioned';
import { ChevronDown, ClockAlert } from 'lucide-react';

/** Rows shown before "Show all", so a long backlog does not push the list away. */
const COLLAPSED_ROW_LIMIT = 4;

/**
 * The Inbox's warning for mail opened and left without an action
 * (elli-ui#1378). It sits above the list and cannot be dismissed: a thread
 * leaves it only when someone acts on it — a status, an assignee, a linked
 * item, a reply, a move. Opening it again is not acting on it.
 */
export function EmailUnactionedBanner({
  accountId,
  items,
  now,
  onOpen,
}: {
  accountId?: string;
  items: UnactionedEmail[];
  now: number;
  onOpen: (email: EmailListItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const listId = useId();
  if (items.length === 0) return null;

  const visible = showAll ? items : items.slice(0, COLLAPSED_ROW_LIMIT);
  const hidden = items.length - visible.length;
  const noun = items.length === 1 ? 'email needs' : 'emails need';

  return (
    // Inset and corner match the search field above it (16px, 10px), and the
    // surface is the mail list's own card, so it reads as part of the list
    // chrome rather than as a system alert.
    <section
      aria-label="Emails opened without an action"
      className="mx-4 mb-3 shrink-0 overflow-hidden rounded-[10px] border border-mail-line bg-mail-card text-mail-ink"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => {
          setHasOpened(true);
          setExpanded((current) => !current);
        }}
        className="group/banner flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mail-accent-soft text-mail-accent">
          <ClockAlert className="size-4" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-semibold leading-4">
            {items.length} {noun} an action
          </span>
          <span className="truncate text-xs leading-4 text-mail-muted">
            Opened, nothing done yet
          </span>
        </span>
        <span className="flex h-7 shrink-0 items-center gap-1 rounded-full border border-mail-line bg-mail-search pe-2 ps-2.5 text-xs font-medium text-mail-ink motion-safe:transition-colors group-hover/banner:bg-mail-chip-hover">
          {/* Both labels share one cell so the pill keeps the wider one's
              width — swapping "Review" for "Hide" would otherwise resize it. */}
          <span className="grid">
            <span className={cn('col-start-1 row-start-1', expanded && 'invisible')}>Review</span>
            <span className={cn('col-start-1 row-start-1', !expanded && 'invisible')}>Hide</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3.5 motion-safe:transition-transform motion-safe:duration-150',
              expanded && 'rotate-180'
            )}
          />
        </span>
      </button>

      {/* Height animates 0fr → 1fr rather than mounting the list, so the mail
          list below slides instead of jumping. Rows mount on first open and
          stay, so closing animates too; `inert` keeps them out of the tab
          order while collapsed. */}
      <div
        id={listId}
        inert={!expanded}
        className={cn(
          'grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-200 motion-safe:ease-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {hasOpened && (
            <div className="border-t border-mail-line">
              <ul className="max-h-80 divide-y divide-mail-hair overflow-y-auto">
                {visible.map((item) => (
                  <UnactionedRow
                    key={item.key}
                    accountId={accountId}
                    item={item}
                    now={now}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
              {items.length > COLLAPSED_ROW_LIMIT && (
                // Indented to the text column: avatar (2rem) + gap (0.75rem) + inset.
                <button
                  type="button"
                  onClick={() => setShowAll((current) => !current)}
                  className="w-full cursor-pointer border-t border-mail-line py-2 pe-3 ps-14 text-left text-xs font-medium text-mail-muted hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {showAll ? 'Show fewer' : `Show ${hidden} more`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function UnactionedRow({
  accountId,
  item,
  now,
  onOpen,
}: {
  accountId?: string;
  item: UnactionedEmail;
  now: number;
  onOpen: (email: EmailListItem) => void;
}) {
  const { email } = item;
  const sender = email.senderName || email.senderEmail;
  // Same columns as the header: the avatar under the clock, the time under the
  // Review control.
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(email)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left motion-safe:transition-colors hover:bg-mail-row-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <SenderAvatar
          name={sender}
          email={email.senderEmail}
          accountId={accountId}
          className="size-8 text-[11px]"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium leading-4 text-mail-ink">{sender}</span>
          <span className="truncate text-xs leading-4 text-mail-muted">
            {email.subject || '(no subject)'}
          </span>
        </span>
        <span className="shrink-0 pe-1 text-[11px] leading-4 tabular-nums text-mail-muted">
          {formatOpenedAgo(item.openedAt, now)}
        </span>
      </button>
    </li>
  );
}
