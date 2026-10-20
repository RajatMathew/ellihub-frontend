import { cn } from '@/app/lib/utils';
import type { EmailActivity } from '@/modules/email/api';
import { EmailThreadActivityEvent } from '@/modules/email/components/email-thread-activity-event';
import { EmailThreadActivityTask } from '@/modules/email/components/email-thread-activity-task';
import {
  AgentAvatar,
  PersonAvatar,
  TriageChips,
} from '@/modules/email/components/email-thread-timeline-entry';
import { useActivityCalendarEvent } from '@/modules/email/hooks/email-activity.hooks';
import { formatEmailMessageDate } from '@/modules/email/lib/email-date';
import { activitySummary } from '@/modules/email/lib/thread-activity';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

/**
 * One line of the email activity feed: who did what, then — quieter — which
 * mailbox and which thread it was done from, linking back to that thread.
 */
export function EmailActivityFeedRow({
  item,
  threadHref,
}: {
  item: EmailActivity;
  threadHref: string | null;
}) {
  const isAgent = item.actor.type === 'agent';
  const subject = item.threadSubject?.trim() || '(No subject)';
  const event = useActivityCalendarEvent(item, false);
  return (
    <li className="flex min-w-0 gap-3 px-4 py-2.5">
      <span className="pt-0.5">
        {isAgent ? <AgentAvatar /> : <PersonAvatar name={item.actor.name} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="min-w-0 text-[13px] leading-5 text-muted-foreground">
          <span className={cn('font-medium', isAgent ? 'text-primary' : 'text-foreground')}>
            {isAgent ? (item.agentName ?? 'Elliot Agent') : item.actor.name}
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
        {item.kind === 'note' && item.note && (
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[13px] text-foreground">
            {item.note}
          </p>
        )}
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0">{item.accountLabel}</span>
          <span aria-hidden="true">·</span>
          {threadHref ? (
            <Link
              to={threadHref}
              title={subject}
              className="min-w-0 truncate hover:text-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              {subject}
            </Link>
          ) : (
            <span className="min-w-0 truncate">{subject}</span>
          )}
        </p>
      </div>
      <time
        dateTime={item.createdAt}
        title={formatEmailMessageDate(item.createdAt)}
        className="shrink-0 pt-px text-[11px] leading-5 text-muted-foreground/80"
      >
        {format(new Date(item.createdAt), 'h:mm a')}
      </time>
    </li>
  );
}
