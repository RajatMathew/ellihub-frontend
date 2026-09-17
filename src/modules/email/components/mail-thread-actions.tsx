import { useMemo } from 'react';

import { cn } from '@/app/lib/utils';
import {
  threadActionsFixture,
  type MailThreadActionKind,
} from '@/modules/email/data/thread-actions.fixture';
import { formatEmailListDate } from '@/modules/email/lib/email-date';
import { Bell, CalendarDays, CheckCircle2, FileText, Link2, ScrollText } from 'lucide-react';

const KIND_ICON: Record<MailThreadActionKind, typeof Bell> = {
  log: ScrollText,
  link: Link2,
  file: FileText,
  notify: Bell,
  schedule: CalendarDays,
  close: CheckCircle2,
};

const MS_PER_HOUR = 3_600_000;

/**
 * What this thread made someone do.
 *
 * **Placeholder data.** elli-core logs email activity against the project, not
 * the thread, so there is nothing per-conversation to read — these come from a
 * fixture, deterministic per thread. The component is written against the shape
 * a real feed would have, so swapping the source is one import.
 */
export function MailThreadActions({
  conversationKey,
  now = new Date(),
}: {
  conversationKey: string;
  now?: Date;
}) {
  const actions = useMemo(() => threadActionsFixture(conversationKey), [conversationKey]);
  if (actions.length === 0) return null;

  return (
    <section className="mt-1 border-t border-mail-hair pt-3.5">
      <p className="mb-2 text-xs font-semibold text-mail-ink">Actions</p>
      <ol className="min-w-0">
        {actions.map((action, index) => {
          const Icon = KIND_ICON[action.kind];
          const isLast = index === actions.length - 1;
          const [before, after] = action.text.split('{}');

          return (
            <li key={action.id} className="flex min-w-0 gap-2.5 py-1.5">
              {/* The rail is one continuous line through the icons, broken only
                  after the last one — a timeline, not a bulleted list. */}
              <span className="relative flex shrink-0 flex-col items-center">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-mail-pane-line bg-mail-paper text-mail-mid">
                  <Icon aria-hidden="true" className="size-3" strokeWidth={2} />
                </span>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-6 bottom-[-8px] mx-auto w-px bg-mail-pane-line"
                  />
                )}
              </span>
              <div className={cn('min-w-0 flex-1 pt-0.5', !isLast && 'pb-1')}>
                <p className="text-[12.5px] leading-snug text-mail-ink">
                  {before}
                  {action.emphasis && <b className="font-semibold">{action.emphasis}</b>}
                  {after}
                </p>
                <p className="mt-0.5 text-[11.5px] text-mail-muted">
                  {formatEmailListDate(
                    new Date(now.getTime() - action.hoursAgo * MS_PER_HOUR).toISOString(),
                    now
                  )}{' '}
                  · By <b className="font-semibold text-mail-mid">{action.by}</b>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
