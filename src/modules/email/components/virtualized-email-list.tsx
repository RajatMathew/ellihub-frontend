import { memo, useMemo, useState } from 'react';

import { cn } from '@/app/lib/utils';
import { EmailRowCard, type EmailListItem } from '@/modules/email/components/email-row-card';
import { groupEmailsByMonth, type EmailMonthGroup } from '@/modules/email/lib/email-month-groups';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown } from 'lucide-react';

interface VirtualizedEmailListProps {
  emails: EmailListItem[];
  accountId?: string;
  scrollElement: HTMLDivElement;
  selectedEmailId?: string;
  groupByMonth?: boolean;
  /** Search term to highlight within each row's subject/preview text. */
  highlightQuery?: string;
  onSelectEmail?: (emailId: string) => void;
  onArchiveEmail?: (email: EmailListItem) => void;
  onDeleteEmail?: (email: EmailListItem) => void;
  onToggleFlagEmail?: (email: EmailListItem) => void;
  checkedIds?: Set<string>;
  onToggleChecked?: (email: EmailListItem, next: boolean, options?: { range?: boolean }) => void;
  bulkSelectActive?: boolean;
}

type EmailListRowProps = {
  email: EmailListItem;
  accountId?: string;
  selected: boolean;
  isChecked: boolean;
  bulkSelectActive: boolean;
  highlightQuery?: string;
  onSelectEmail?: (emailId: string) => void;
  onArchiveEmail?: (email: EmailListItem) => void;
  onDeleteEmail?: (email: EmailListItem) => void;
  onToggleFlagEmail?: (email: EmailListItem) => void;
  onToggleChecked?: (email: EmailListItem, next: boolean, options?: { range?: boolean }) => void;
};

/**
 * One row, re-rendered only when something about *that* row changed.
 *
 * The per-row arrow functions are created in here rather than at the call
 * site, which is the whole point: created outside, every one of them is a new
 * identity on every parent render and `memo` can never hit. Typing a character
 * into search re-rendered all fifty rows — 70-226ms of synchronous work per
 * keystroke, measured — because the list, the rows and the reading pane all
 * sit under the same page state. With this boundary a keystroke re-renders the
 * rows whose highlight actually changed and leaves the rest alone.
 *
 * The callbacks it takes are stable (`useCallback` in `mailbox-page`), so the
 * default shallow comparison is enough — no custom comparator to go stale.
 */
const EmailListRow = memo(function EmailListRow({
  email,
  accountId,
  selected,
  isChecked,
  bulkSelectActive,
  highlightQuery,
  onSelectEmail,
  onArchiveEmail,
  onDeleteEmail,
  onToggleFlagEmail,
  onToggleChecked,
}: EmailListRowProps) {
  return (
    <EmailRowCard
      accountId={accountId}
      email={email}
      selected={selected}
      highlightQuery={highlightQuery}
      onSelect={() => onSelectEmail?.(email.id)}
      onArchive={onArchiveEmail ? () => onArchiveEmail(email) : undefined}
      onDelete={onDeleteEmail ? () => onDeleteEmail(email) : undefined}
      onToggleFlag={onToggleFlagEmail ? () => onToggleFlagEmail(email) : undefined}
      isChecked={isChecked}
      onCheckedChange={
        onToggleChecked ? (next, options) => onToggleChecked(email, next, options) : undefined
      }
      bulkSelectActive={bulkSelectActive}
    />
  );
});

const ESTIMATED_EMAIL_ROW_HEIGHT = 154;
const ESTIMATED_MONTH_HEADER_HEIGHT = 33;

export function VirtualizedEmailList({
  emails,
  accountId,
  scrollElement,
  selectedEmailId,
  groupByMonth = false,
  highlightQuery,
  onSelectEmail,
  onArchiveEmail,
  onDeleteEmail,
  onToggleFlagEmail,
  checkedIds,
  onToggleChecked,
  bulkSelectActive = false,
}: VirtualizedEmailListProps) {
  if (groupByMonth) {
    return (
      <VirtualizedMonthGroups
        emails={emails}
        accountId={accountId}
        scrollElement={scrollElement}
        selectedEmailId={selectedEmailId}
        highlightQuery={highlightQuery}
        onSelectEmail={onSelectEmail}
        onArchiveEmail={onArchiveEmail}
        onDeleteEmail={onDeleteEmail}
        onToggleFlagEmail={onToggleFlagEmail}
        checkedIds={checkedIds}
        onToggleChecked={onToggleChecked}
        bulkSelectActive={bulkSelectActive}
      />
    );
  }

  return (
    <VirtualizedFlatEmailList
      emails={emails}
      accountId={accountId}
      scrollElement={scrollElement}
      selectedEmailId={selectedEmailId}
      highlightQuery={highlightQuery}
      onSelectEmail={onSelectEmail}
      onArchiveEmail={onArchiveEmail}
      onDeleteEmail={onDeleteEmail}
      onToggleFlagEmail={onToggleFlagEmail}
      checkedIds={checkedIds}
      onToggleChecked={onToggleChecked}
      bulkSelectActive={bulkSelectActive}
    />
  );
}

function VirtualizedFlatEmailList({
  emails,
  accountId,
  scrollElement,
  selectedEmailId,
  highlightQuery,
  onSelectEmail,
  onArchiveEmail,
  onDeleteEmail,
  onToggleFlagEmail,
  checkedIds,
  onToggleChecked,
  bulkSelectActive = false,
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
            <EmailListRow
              accountId={accountId}
              email={email}
              selected={email.id === selectedEmailId}
              highlightQuery={highlightQuery}
              isChecked={checkedIds?.has(email.id) ?? false}
              bulkSelectActive={bulkSelectActive}
              onSelectEmail={onSelectEmail}
              onArchiveEmail={onArchiveEmail}
              onDeleteEmail={onDeleteEmail}
              onToggleFlagEmail={onToggleFlagEmail}
              onToggleChecked={onToggleChecked}
            />
          </div>
        );
      })}
    </div>
  );
}

function VirtualizedMonthGroups({
  emails,
  accountId,
  scrollElement,
  selectedEmailId,
  highlightQuery,
  onSelectEmail,
  onArchiveEmail,
  onDeleteEmail,
  onToggleFlagEmail,
  checkedIds,
  onToggleChecked,
  bulkSelectActive = false,
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
              accountId={accountId}
              group={group}
              collapsed={collapsedMonthKeys.has(group.key)}
              selectedEmailId={selectedEmailId}
              highlightQuery={highlightQuery}
              onSelectEmail={onSelectEmail}
              onArchiveEmail={onArchiveEmail}
              onDeleteEmail={onDeleteEmail}
              onToggleFlagEmail={onToggleFlagEmail}
              checkedIds={checkedIds}
              onToggleChecked={onToggleChecked}
              bulkSelectActive={bulkSelectActive}
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
  accountId,
  collapsed,
  selectedEmailId,
  highlightQuery,
  onSelectEmail,
  onArchiveEmail,
  onDeleteEmail,
  onToggleFlagEmail,
  checkedIds,
  onToggleChecked,
  bulkSelectActive = false,
  onToggle,
}: {
  group: EmailMonthGroup;
  accountId?: string;
  collapsed: boolean;
  selectedEmailId?: string;
  highlightQuery?: string;
  onSelectEmail?: (emailId: string) => void;
  onArchiveEmail?: (email: EmailListItem) => void;
  onDeleteEmail?: (email: EmailListItem) => void;
  onToggleFlagEmail?: (email: EmailListItem) => void;
  checkedIds?: Set<string>;
  onToggleChecked?: (email: EmailListItem, next: boolean, options?: { range?: boolean }) => void;
  bulkSelectActive?: boolean;
  onToggle: () => void;
}) {
  const emailCountLabel = `${group.emails.length} ${group.emails.length === 1 ? 'email' : 'emails'}`;
  const triggerId = `email-month-trigger-${group.key}`;
  const contentId = `email-month-content-${group.key}`;

  return (
    <section>
      {/*
        Sticky, and sitting on the mail paper rather than in a band of its own:
        several of these share `position: sticky`, so the browser already slides
        the next one up over the last as the list scrolls. The count is a bare
        number — "Today 9" over nine rows needs no unit (elli-ui#921).
      */}
      <h2 className="m-0">
        <button
          id={triggerId}
          type="button"
          className={cn(
            'mail-group-header sticky top-0 z-20 flex w-full cursor-pointer items-center gap-2 bg-mail-paper px-4 pb-[7px] pt-2 text-left',
            'text-xs font-semibold tracking-[0.01em] text-mail-mid',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
          )}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={onToggle}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3.5 shrink-0 text-mail-muted opacity-60 motion-safe:transition-transform motion-safe:duration-150',
              collapsed && '-rotate-90'
            )}
            strokeWidth={2}
          />
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          <span
            className="shrink-0 text-[11px] font-normal tabular-nums text-mail-muted"
            aria-label={emailCountLabel}
          >
            {group.emails.length}
          </span>
        </button>
      </h2>
      <div id={contentId} role="region" aria-labelledby={triggerId} hidden={collapsed}>
        {!collapsed && (
          <div role="list" aria-label={`${group.label} emails`}>
            {group.emails.map((email) => (
              <div key={email.id} role="listitem">
                <EmailListRow
                  accountId={accountId}
                  email={email}
                  selected={email.id === selectedEmailId}
                  highlightQuery={highlightQuery}
                  isChecked={checkedIds?.has(email.id) ?? false}
                  bulkSelectActive={bulkSelectActive}
                  onSelectEmail={onSelectEmail}
                  onArchiveEmail={onArchiveEmail}
                  onDeleteEmail={onDeleteEmail}
                  onToggleFlagEmail={onToggleFlagEmail}
                  onToggleChecked={onToggleChecked}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
