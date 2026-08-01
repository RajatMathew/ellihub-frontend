import { useMemo, useState } from 'react';

import { cn } from '@/app/lib/utils';
import { EmailRowCard, type EmailListItem } from '@/modules/email/components/email-row-card';
import { groupEmailsByMonth, type EmailMonthGroup } from '@/modules/email/lib/email-month-groups';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight } from 'lucide-react';

interface VirtualizedEmailListProps {
  emails: EmailListItem[];
  scrollElement: HTMLDivElement;
  selectedEmailId?: string;
  groupByMonth?: boolean;
  onSelectEmail?: (emailId: string) => void;
}

const ESTIMATED_EMAIL_ROW_HEIGHT = 132;
const ESTIMATED_MONTH_HEADER_HEIGHT = 48;

export function VirtualizedEmailList({
  emails,
  scrollElement,
  selectedEmailId,
  groupByMonth = false,
  onSelectEmail,
}: VirtualizedEmailListProps) {
  if (groupByMonth) {
    return (
      <VirtualizedMonthGroups
        emails={emails}
        scrollElement={scrollElement}
        selectedEmailId={selectedEmailId}
        onSelectEmail={onSelectEmail}
      />
    );
  }

  return (
    <VirtualizedFlatEmailList
      emails={emails}
      scrollElement={scrollElement}
      selectedEmailId={selectedEmailId}
      onSelectEmail={onSelectEmail}
    />
  );
}

function VirtualizedFlatEmailList({
  emails,
  scrollElement,
  selectedEmailId,
  onSelectEmail,
}: Omit<VirtualizedEmailListProps, 'groupByMonth'>) {
  // TanStack Virtual owns mutable measurement state; React Compiler must not memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => ESTIMATED_EMAIL_ROW_HEIGHT,
    getItemKey: (index) => emails[index]?.id ?? index,
    overscan: 6,
  });
  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      role="list"
      aria-label="Emails"
      className="relative w-full"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualRows.map((virtualRow) => {
        const email = emails[virtualRow.index];
        if (!email) return null;

        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            role="listitem"
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            <EmailRowCard
              email={email}
              selected={email.id === selectedEmailId}
              onSelect={() => onSelectEmail?.(email.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

function VirtualizedMonthGroups({
  emails,
  scrollElement,
  selectedEmailId,
  onSelectEmail,
}: Omit<VirtualizedEmailListProps, 'groupByMonth'>) {
  const [collapsedMonthKeys, setCollapsedMonthKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const monthGroups = useMemo(() => groupEmailsByMonth(emails), [emails]);

  // TanStack Virtual owns mutable measurement state; React Compiler must not memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: monthGroups.length,
    getScrollElement: () => scrollElement,
    estimateSize: (index) => {
      const group = monthGroups[index];
      if (!group || collapsedMonthKeys.has(group.key)) return ESTIMATED_MONTH_HEADER_HEIGHT;
      return ESTIMATED_MONTH_HEADER_HEIGHT + group.emails.length * ESTIMATED_EMAIL_ROW_HEIGHT;
    },
    getItemKey: (index) => monthGroups[index]?.key ?? index,
    overscan: 2,
  });
  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      aria-label="Emails grouped by date"
      className="relative w-full"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualRows.map((virtualRow) => {
        const group = monthGroups[virtualRow.index];
        if (!group) return null;

        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            <MonthGroupSection
              group={group}
              collapsed={collapsedMonthKeys.has(group.key)}
              selectedEmailId={selectedEmailId}
              onSelectEmail={onSelectEmail}
              onToggle={() =>
                setCollapsedMonthKeys((current) => {
                  const next = new Set(current);
                  if (next.has(group.key)) {
                    next.delete(group.key);
                  } else {
                    next.add(group.key);
                  }
                  return next;
                })
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function MonthGroupSection({
  group,
  collapsed,
  selectedEmailId,
  onSelectEmail,
  onToggle,
}: {
  group: EmailMonthGroup;
  collapsed: boolean;
  selectedEmailId?: string;
  onSelectEmail?: (emailId: string) => void;
  onToggle: () => void;
}) {
  const emailCountLabel = `${group.emails.length} ${group.emails.length === 1 ? 'email' : 'emails'}`;
  const triggerId = `email-month-trigger-${group.key}`;
  const contentId = `email-month-content-${group.key}`;

  return (
    <section>
      <h2 className="m-0 bg-muted/40">
        <button
          id={triggerId}
          type="button"
          className={cn(
            'flex min-h-12 w-full cursor-pointer items-center gap-2 border-b border-border px-3 text-left',
            'text-sm font-semibold text-foreground hover:bg-accent/60',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            'motion-safe:transition-colors motion-safe:duration-150'
          )}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={onToggle}
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150',
              !collapsed && 'rotate-90'
            )}
            strokeWidth={1.8}
          />
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {emailCountLabel}
          </span>
        </button>
      </h2>
      <div id={contentId} role="region" aria-labelledby={triggerId} hidden={collapsed}>
        {!collapsed && (
          <div role="list" aria-label={`${group.label} emails`}>
            {group.emails.map((email) => (
              <div key={email.id} role="listitem">
                <EmailRowCard
                  email={email}
                  selected={email.id === selectedEmailId}
                  onSelect={() => onSelectEmail?.(email.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
