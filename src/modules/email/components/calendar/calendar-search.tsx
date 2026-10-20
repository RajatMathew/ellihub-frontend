import { useDeferredValue, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { WorkspaceSearch } from '@/app/components/workspace-search';
import { cn } from '@/app/lib/utils';
import type { CalendarSelectionRow } from '@/modules/email/api';
import {
  CALENDAR_EVENT_STYLES,
  toCalendarEvent,
  type CalendarEvent,
} from '@/modules/email/components/calendar/email-calendar-types';
import { useCalendarEventsQuery } from '@/modules/email/hooks/calendar.hooks';
import {
  calendarSearchWindow,
  rankSearchResults,
  searchWords,
} from '@/modules/email/lib/calendar-search';
import { format, isSameYear } from 'date-fns';
import { Search } from 'lucide-react';

/**
 * The calendar's search box (elli-ui#1380). Typing filters the period on
 * screen straight away (the view does that with `value`); this adds a list of
 * matches from a month back to three months ahead, so an event outside the
 * week can be found and opened.
 */
export function CalendarSearch({
  accountId,
  enabled,
  value,
  onChange,
  selection,
  ownAddress,
  onPick,
}: {
  accountId: string | null | undefined;
  enabled: boolean;
  value: string;
  onChange: (value: string) => void;
  selection: Map<string, CalendarSelectionRow>;
  /** The mailbox's own address, left out of matching. */
  ownAddress?: string | null;
  /** Opens a match: the view moves to its day and opens it. */
  onPick: (event: CalendarEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  // Folded to an icon while empty, so the toolbar is not one more box wide.
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(0);
  const words = searchWords(value);
  // The wide window is fetched once per day, starting the moment the box
  // opens, so it is usually in by the time the first word is typed rather
  // than requested only after it (elli-ui#1490).
  const range = useMemo(() => calendarSearchWindow(new Date()), []);
  const wide = useCalendarEventsQuery(
    accountId ? { accountId, ...range } : { accountId: undefined },
    enabled && (expanded || words.length > 0)
  );
  // Mapped once per answer, not per keystroke; the search reads these same
  // objects, which is what lets it keep each event's text between keys.
  const wideEvents = useMemo(
    () => (wide.data ?? []).flatMap((record) => toCalendarEvent(record, selection) ?? []),
    [wide.data, selection]
  );
  const deferredValue = useDeferredValue(value);
  const results = useMemo(
    () => rankSearchResults(wideEvents, searchWords(deferredValue), new Date(), ownAddress),
    [wideEvents, deferredValue, ownAddress]
  );
  const showList = open && words.length > 0;
  const pick = (event: CalendarEvent) => {
    onPick(event);
    setOpen(false);
  };

  if (!expanded && !value) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Search events"
        title="Search events"
        className="size-9 p-0 text-muted-foreground"
        onClick={() => setExpanded(true)}
      >
        <Search aria-hidden="true" className="size-4" />
      </Button>
    );
  }

  return (
    <div
      className="relative w-full sm:w-56"
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setOpen(false);
        if (!value) setExpanded(false);
      }}
      onKeyDown={(event) => {
        if (!showList || results.length === 0) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const step = event.key === 'ArrowDown' ? 1 : -1;
          setActive((index) => (index + step + results.length) % results.length);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          const chosen = results[Math.min(active, results.length - 1)];
          if (chosen) pick(chosen);
        }
      }}
    >
      <WorkspaceSearch
        id="calendar-search"
        label="Search events"
        placeholder="Search events"
        value={value}
        onChange={(next) => {
          onChange(next);
          setActive(0);
          setOpen(true);
        }}
        busy={words.length > 0 && wide.isFetching}
        autoFocus={expanded}
      />
      {showList ? (
        <div
          role="listbox"
          aria-label="Matching events"
          className="absolute right-0 top-full z-50 mt-1.5 max-h-96 w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border/70 bg-popover p-1.5 shadow-lg"
        >
          <p className="px-2 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
            Past month to next 3 months
          </p>
          {wide.isPending ? (
            <p className="px-2 py-3 text-center text-[13px] text-muted-foreground">Searching…</p>
          ) : wide.isError ? (
            <p className="px-2 py-3 text-center text-[13px] text-muted-foreground">
              Couldn’t search the calendar. The week on screen is still filtered.
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-3 text-center text-[13px] text-muted-foreground">
              No events match “{value.trim()}”
            </p>
          ) : (
            results.map((event, index) => (
              <button
                key={`${event.calendarId}:${event.id}:${event.start.getTime()}`}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(event)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left',
                  index === active ? 'bg-accent' : 'hover:bg-accent'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-8 w-1 shrink-0 rounded-full',
                    CALENDAR_EVENT_STYLES[event.color].accent
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-foreground">
                    {event.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {whenLabel(event)}
                    {event.location ? ` · ${event.location}` : ''}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function whenLabel(event: CalendarEvent): string {
  const day = format(
    event.start,
    isSameYear(event.start, new Date()) ? 'EEE, d MMM' : 'EEE, d MMM yyyy'
  );
  return event.allDay ? `${day} · All day` : `${day} · ${format(event.start, 'h:mm a')}`;
}
