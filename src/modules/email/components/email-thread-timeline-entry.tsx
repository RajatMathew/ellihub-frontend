import type { ReactNode } from 'react';

import { getInitials } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import type { EmailActivity } from '@/modules/email/api';
import { EmailThreadActivityEvent } from '@/modules/email/components/email-thread-activity-event';
import { EmailThreadActivityTask } from '@/modules/email/components/email-thread-activity-task';
import { useActivityCalendarEvent } from '@/modules/email/hooks/email-activity.hooks';
import { formatEmailMessageDate } from '@/modules/email/lib/email-date';
import { activitySummary, triageChips } from '@/modules/email/lib/thread-activity';
import { format } from 'date-fns';
import { CircleCheck, CircleDotDashed, Link2, Link2Off, UserRound } from 'lucide-react';

const AGENT_NAME = 'Elliot Agent';

const COURT_LABELS: Record<string, string> = {
  unset: 'Not set',
  open: 'Open',
  open_our_court: 'Open, our court',
  open_their_court: 'Open, their court',
  closed: 'Closed',
};

/**
 * What one email made someone do (elli-ui#1309) — the rows the server
 * recorded for this message, above the message itself, on a rail like the
 * message card's own thread. A person's row leads with their initials;
 * Elliot's with its mark and the person who approved it.
 *
 * Each row is one line: who did it and what, with the time to the right. The
 * message card below already carries the full date, so the rail does not
 * repeat it on every row.
 */
export function EmailThreadTimelineEntry({ items }: { items: readonly EmailActivity[] }) {
  if (items.length === 0) return null;
  return (
    <ol className="min-w-0 pl-2 pr-4">
      {items.map((item) => (
        <EmailActivityRow key={item.id} item={item} />
      ))}
    </ol>
  );
}

/** One recorded action on the rail. */
export function EmailActivityRow({ item }: { item: EmailActivity }) {
  const isAgent = item.actor.type === 'agent';
  const event = useActivityCalendarEvent(item);
  return (
    <TimelineRailRow
      avatar={isAgent ? <AgentAvatar /> : <PersonAvatar name={item.actor.name} />}
      time={item.createdAt}
    >
      <p className="min-w-0 text-[13px] leading-5 text-muted-foreground">
        <span className={cn('font-medium', isAgent ? 'text-primary' : 'text-foreground')}>
          {isAgent ? (item.agentName ?? AGENT_NAME) : item.actor.name}
        </span>{' '}
        {activitySummary(item, Boolean(event))}
        {isAgent && item.approvedBy && (
          <span className="text-xs text-muted-foreground/80">
            {' · approved by '}
            <span className="text-muted-foreground">{item.approvedBy.name}</span>
          </span>
        )}
      </p>
      {item.kind === 'triage' && <TriageChips item={item} />}
      {event && <EmailThreadActivityEvent link={event} />}
      {item.task && <EmailThreadActivityTask task={item.task} />}
    </TimelineRailRow>
  );
}

/** What a triage row changed, as chips — the court, the assignee, the records. */
export function TriageChips({ item }: { item: EmailActivity }) {
  const { status, assignee, references, unlinked } = triageChips(item);
  if (!status && !assignee && references.length === 0 && unlinked.length === 0) return null;
  const isOpen = status !== 'closed';
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {status && (
        <span
          className={cn(
            'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold',
            isOpen
              ? 'bg-destructive-soft text-destructive-soft-foreground'
              : 'bg-success-soft text-success-soft-foreground'
          )}
        >
          {isOpen ? (
            <CircleDotDashed aria-hidden="true" className="size-3" />
          ) : (
            <CircleCheck aria-hidden="true" className="size-3" />
          )}
          {COURT_LABELS[status] ?? status}
        </span>
      )}
      {assignee && <TriageChip icon={<UserRound aria-hidden="true" />}>{assignee}</TriageChip>}
      {references.map((reference) => (
        <TriageChip
          key={`${reference.type}-${reference.label}`}
          icon={<Link2 aria-hidden="true" />}
        >
          {reference.label}
        </TriageChip>
      ))}
      {unlinked.map((label) => (
        <TriageChip key={`unlinked-${label}`} icon={<Link2Off aria-hidden="true" />} removed>
          {label}
        </TriageChip>
      ))}
    </div>
  );
}

/**
 * One row on the rail: an avatar in the continuous line, the content beside
 * it, and — when it has one — the time on the right of its first line (the
 * full date is its tooltip; the message card below already shows the day).
 */
export function TimelineRailRow({
  avatar,
  time,
  tight = false,
  children,
}: {
  avatar: ReactNode;
  time?: string;
  /** Less space under the row — for one that ends in its own buttons, like the note editor. */
  tight?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="group flex min-w-0 gap-2.5">
      {/* The rail is one continuous line through the avatars — extending past
          the last one into the message card below it, so it never looks like
          it stops mid-air. */}
      <span className="relative flex w-5 shrink-0 flex-col items-center">
        {avatar}
        <span aria-hidden="true" className="mt-1 w-px flex-1 bg-border" />
      </span>

      <div className={cn('flex min-w-0 flex-1 gap-3', tight ? 'pb-1' : 'pb-3.5')}>
        <div className="min-w-0 flex-1">{children}</div>
        {time && (
          <time
            dateTime={time}
            title={formatEmailMessageDate(time)}
            className="shrink-0 pt-px text-[11px] leading-5 text-muted-foreground/80"
          >
            {format(new Date(time), 'h:mm a')}
          </time>
        )}
      </div>
    </li>
  );
}

/** Elliot's own mark — the same one the agent panel's header shows. */
export function AgentAvatar() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-mail-pane-line bg-mail-card">
      <img src="/favicon/apple-touch-icon.png" alt="" className="size-4 object-contain" />
    </span>
  );
}

/** A person's initials, the way a sender shows in the mail list. */
export function PersonAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground"
    >
      {getInitials(name, 2)}
    </span>
  );
}

function TriageChip({
  icon,
  removed = false,
  children,
}: {
  icon: ReactNode;
  /** An unlinked record: struck through, and named so for a screen reader. */
  removed?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-0 max-w-full items-center gap-1 truncate rounded-full px-2 text-[11px] font-medium',
        removed ? 'border border-border text-muted-foreground/80' : 'bg-muted text-muted-foreground'
      )}
    >
      <span className="shrink-0 text-muted-foreground/70 [&_svg]:size-3">{icon}</span>
      {removed && <span className="sr-only">Unlinked </span>}
      <span className={cn('truncate', removed && 'line-through')}>{children}</span>
    </span>
  );
}
