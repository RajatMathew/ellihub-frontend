import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import type {
  CalendarSelectionRow,
  CalendarSummary,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@/modules/email/api';
import { CalendarSearch } from '@/modules/email/components/calendar/calendar-search';
import { EmailCalendarDayView } from '@/modules/email/components/calendar/email-calendar-day-view';
import {
  EmailCalendarEventDialog,
  type CalendarEventDialogSubmit,
} from '@/modules/email/components/calendar/email-calendar-event-dialog';
import { EmailCalendarMonthView } from '@/modules/email/components/calendar/email-calendar-month-view';
import { EmailCalendarOnboardingDialog } from '@/modules/email/components/calendar/email-calendar-onboarding-dialog';
import { CalendarPickerMenu } from '@/modules/email/components/calendar/email-calendar-picker-menu';
import {
  toCalendarEvent,
  type CalendarEvent,
} from '@/modules/email/components/calendar/email-calendar-types';
import { EmailCalendarWeekView } from '@/modules/email/components/calendar/email-calendar-week-view';
import {
  useCalendarEventsQuery,
  useCalendarListQuery,
  useCalendarSelectionQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useSaveCalendarEventEdit,
  useSetCalendarEventDoneMutation,
  useSetCalendarEventLinksMutation,
} from '@/modules/email/hooks';
import { serializeEventDate } from '@/modules/email/lib/calendar-event-form';
import {
  calendarProjectOptions,
  eventsInProjects,
  type CalendarProject,
} from '@/modules/email/lib/calendar-project-filter';
import { eventMatchesSearch, searchWords } from '@/modules/email/lib/calendar-search';
import { toEventLinkInputs } from '@/modules/email/lib/event-modal-links';
import { TaskProjectFilter } from '@/modules/tasks/components/task-project-filter';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export type CalendarView = 'day' | 'week' | 'month';

const VIEW_TABS: Array<{ id: CalendarView; label: string }> = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

interface EmailCalendarViewProps {
  /** Aurinko-connected mailbox to read/write calendar data against. */
  accountId?: string | null;
  /**
   * That mailbox's address. The picker lists this mailbox's calendars beside
   * every other shared mailbox's; the address beside this one's default calendar
   * makes the owner unmistakable (elli-ui#1241, elli-ui#1395). Passed
   * down rather than queried here: the caller already holds the account.
   */
  mailboxAddress?: string | null;
  /**
   * When the current account isn't an Outlook mailbox we can't hit the
   * calendar API (Gmail is not supported yet). The caller can also pass this
   * to render the unsupported state pre-emptively.
   */
  provider?: 'outlook' | 'gmail' | 'zoho' | null;
}

export function EmailCalendarView({
  accountId = null,
  mailboxAddress = null,
  provider = null,
}: EmailCalendarViewProps) {
  const [view, setView] = useState<CalendarView>('week');
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    editing: CalendarEvent | null;
    initialStart?: Date;
    /** Duplicate: create mode, pre-filled from this event. */
    template?: CalendarEvent | null;
  }>({ open: false, editing: null });
  const [manualOnboardingOpen, setManualOnboardingOpen] = useState(false);
  // Once the user dismisses the auto-onboarding for a given account we don't
  // re-open it — that would trap a user who explicitly wants zero calendars
  // showing until they choose to Manage it themselves.
  const [dismissedForAccount, setDismissedForAccount] = useState<string | null>(null);

  const supported = provider === null || provider === 'outlook';
  const canQuery = Boolean(accountId) && supported;

  const selectionQuery = useCalendarSelectionQuery(accountId ?? undefined, canQuery);
  const calendarsQuery = useCalendarListQuery(accountId ?? undefined, canQuery);

  const { from, to } = useMemo(() => queryRangeFor(view, cursor), [view, cursor]);

  const selection = useMemo(() => selectionQuery.data ?? [], [selectionQuery.data]);
  const selectionByCalendar = useMemo(
    () => new Map(selection.map((row) => [row.aurinkoCalendarId, row])),
    [selection]
  );
  // No calendarIds filter: the server defaults to the user's non-hidden
  // selection, so the events fetch starts in PARALLEL with the selection
  // query instead of waterfalling behind it. Selection/visibility mutations
  // invalidate the events query, which re-reads the new server-side state.
  const eventsQuery = useCalendarEventsQuery(
    accountId ? { accountId, from, to } : { accountId: undefined },
    canQuery
  );

  // Derive onboarding open state so we never call setState from an effect.
  // Auto-open when the user has no calendars picked yet for this account and
  // hasn't dismissed the prompt. The "Manage" button flips manualOnboardingOpen.
  const shouldAutoOpenOnboarding =
    canQuery &&
    !selectionQuery.isLoading &&
    !selectionQuery.isError &&
    selection.length === 0 &&
    dismissedForAccount !== accountId;
  const onboardingOpen = manualOnboardingOpen || shouldAutoOpenOnboarding;

  const setOnboardingOpen = (open: boolean) => {
    if (open) {
      setManualOnboardingOpen(true);
      return;
    }
    setManualOnboardingOpen(false);
    if (shouldAutoOpenOnboarding && accountId) setDismissedForAccount(accountId);
  };

  const events = useMemo<CalendarEvent[]>(() => {
    if (!eventsQuery.data) return [];
    const mapped: CalendarEvent[] = [];
    for (const record of eventsQuery.data) {
      const event = toCalendarEvent(record, selectionByCalendar);
      if (event) mapped.push(event);
    }
    return mapped;
  }, [eventsQuery.data, selectionByCalendar]);

  // Filter by project (elli-ui#1381): the projects of the threads each event is
  // linked to. Kept as objects so a chosen project keeps its name on a week
  // with none of its events.
  const [projectFilter, setProjectFilter] = useState<CalendarProject[]>([]);
  const projectOptions = useMemo(
    () => calendarProjectOptions(events, projectFilter),
    [events, projectFilter]
  );
  // Search (elli-ui#1380): the period on screen narrows as the reader types.
  // Deferred, so the box takes each key at once and the grid catches up.
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const visibleEvents = useMemo(() => {
    const words = searchWords(deferredSearch);
    return eventsInProjects(
      events,
      projectFilter.map((project) => project.id)
    ).filter((event) => eventMatchesSearch(event, words, mailboxAddress));
  }, [events, projectFilter, deferredSearch, mailboxAddress]);

  const createMutation = useCreateCalendarEventMutation();
  const { save: saveEdit, isPending: savingEdit } = useSaveCalendarEventEdit();
  const deleteMutation = useDeleteCalendarEventMutation();
  const doneMutation = useSetCalendarEventDoneMutation();

  const writableCalendars = useMemo(() => {
    if (!calendarsQuery.data) return selection;
    const readOnlyIds = new Set(
      calendarsQuery.data.filter((cal) => cal.readOnly).map((cal) => cal.id)
    );
    return selection.filter((row) => !readOnlyIds.has(row.aurinkoCalendarId));
  }, [calendarsQuery.data, selection]);

  const openCreate = useCallback((initialStart?: Date) => {
    setDialogState({
      open: true,
      editing: null,
      initialStart: initialStart ?? defaultCreateSlot(),
    });
  }, []);

  const openEdit = useCallback((event: CalendarEvent) => {
    setDialogState({ open: true, editing: event });
  }, []);

  // Opens the copy for review rather than creating it on the spot
  // (elli-ui#1260). The one-click copy left out the description and
  // attendees; copying the attendees straight away would have emailed every
  // one of them a fresh invitation they had not been asked about.
  const duplicate = useCallback((event: CalendarEvent) => {
    setDialogState({ open: true, editing: null, template: event });
  }, []);

  const remove = useCallback(
    (event: CalendarEvent) => {
      if (!accountId) return;
      deleteMutation.mutate({
        accountId,
        calendarId: event.calendarId,
        eventId: event.id,
      });
    },
    [accountId, deleteMutation]
  );

  const toggleDone = useCallback(
    (event: CalendarEvent) => {
      if (!accountId) return;
      doneMutation.mutate({
        accountId,
        calendarId: event.calendarId,
        eventId: event.id,
        done: !event.done,
      });
    },
    [accountId, doneMutation]
  );

  const setLinksMutation = useSetCalendarEventLinksMutation();

  const handleDialogSubmit = useCallback(
    (input: CalendarEventDialogSubmit, editingId: string | null) => {
      if (!accountId) return;
      if (input.mode === 'create') {
        const payload: CreateCalendarEventInput = {
          accountId,
          // Empty when there was no calendar to pick: the mailbox's primary.
          calendarId: input.calendarId || undefined,
          subject: input.subject,
          description: input.description,
          start: serializeEventDate(input.start, input.isAllDay),
          end: serializeEventDate(input.end, input.isAllDay),
          isAllDay: input.isAllDay,
          location: input.location,
          timeZone: input.timeZone,
          isOnlineMeeting: input.isOnlineMeeting,
          recurrence: input.recurrence,
          attendees: input.attendees,
          color: input.color,
          ...toEventLinkInputs({ emails: input.emailLinks, records: input.recordLinks }),
        };
        createMutation.mutate(payload, {
          onSuccess: () => setDialogState({ open: false, editing: null }),
        });
        return;
      }
      const editing = dialogState.editing;
      if (!editing || !editingId) return;
      const target = { accountId, calendarId: editing.calendarId, eventId: editingId };
      const update: UpdateCalendarEventInput | undefined = input.detailsChanged
        ? {
            ...target,
            subject: input.subject,
            description: input.description,
            start: serializeEventDate(input.start, input.isAllDay),
            end: serializeEventDate(input.end, input.isAllDay),
            isAllDay: input.isAllDay,
            location: input.location,
            attendees: input.attendees,
          }
        : undefined;
      // The links are Elli's, not the provider's: saved alongside, and an edit
      // that changed only them closes once they are in.
      if (input.links) {
        setLinksMutation.mutate({ ...target, ...toEventLinkInputs(input.links) });
      }
      if (!update && input.color === undefined) {
        if (input.links) setDialogState({ open: false, editing: null });
        return;
      }
      saveEdit(
        {
          update,
          color: input.color !== undefined ? { ...target, color: input.color } : undefined,
        },
        () => setDialogState({ open: false, editing: null })
      );
    },
    [accountId, createMutation, dialogState.editing, saveEdit, setLinksMutation]
  );

  const handleDialogDelete = useCallback(
    (event: CalendarEvent, target: 'occurrence' | 'series') => {
      if (!accountId) return;
      // Deleting the series master's event id (rather than this occurrence's)
      // is what makes the provider remove every occurrence — there's no
      // separate series-delete endpoint or flag.
      const eventId = target === 'series' && event.seriesMasterId ? event.seriesMasterId : event.id;
      deleteMutation.mutate(
        { accountId, calendarId: event.calendarId, eventId },
        { onSuccess: () => setDialogState({ open: false, editing: null }) }
      );
    },
    [accountId, deleteMutation]
  );

  const periodLabel = useMemo(() => formatPeriodLabel(cursor, view), [cursor, view]);

  const shift = (direction: 1 | -1) => {
    setCursor((current) => {
      if (view === 'day') return direction > 0 ? addDays(current, 1) : subDays(current, 1);
      if (view === 'week') return direction > 0 ? addWeeks(current, 1) : subWeeks(current, 1);
      return direction > 0 ? addMonths(current, 1) : subMonths(current, 1);
    });
  };

  // --- non-happy paths ----------------------------------------------------

  if (!accountId) {
    return (
      <EmptyCalendarState
        title="Connect an Outlook mailbox to see your calendar."
        body="Head to Email → connect an Outlook account. Once it's linked, your calendars appear here."
      />
    );
  }

  if (!supported) {
    return (
      <EmptyCalendarState
        title="Calendar is Outlook-only right now."
        body="This mailbox uses another provider. Connect an Outlook (Office 365) account to see and manage a calendar in Elli."
      />
    );
  }

  // --- happy path ---------------------------------------------------------

  const selectionLoading = selectionQuery.isLoading;
  const showEmptySelection = !selectionLoading && selection.length === 0 && !onboardingOpen;
  // Full skeleton only when there is nothing to show yet; afterwards paging
  // keeps the previous window rendered (keepPreviousData) with a subtle
  // toolbar spinner while the next one loads.
  const showEventsSkeleton = eventsQuery.isLoading && !eventsQuery.data;
  const eventsRefreshing = eventsQuery.isFetching && !showEventsSkeleton;
  const showEventsError = eventsQuery.isError && !eventsQuery.isFetching;

  return (
    <section
      className="flex min-h-0 flex-1 flex-col bg-background"
      aria-labelledby="email-calendar-heading"
    >
      <h2 id="email-calendar-heading" className="sr-only">
        Calendar
      </h2>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-background px-3 py-2 sm:px-4">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 px-3"
              onClick={() => setCursor(startOfDay(new Date()))}
            >
              Today
            </Button>
            <div className="ml-1 flex items-center">
              <IconButton label="Previous period" onClick={() => shift(-1)}>
                <ChevronLeft aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton label="Next period" onClick={() => shift(1)}>
                <ChevronRight aria-hidden="true" className="size-4" />
              </IconButton>
            </div>
            <PeriodMenu label={periodLabel} view={view} onChange={setView} />
            {eventsRefreshing && (
              <Loader2
                aria-label="Refreshing events"
                className="size-4 animate-spin text-muted-foreground"
              />
            )}
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            <CalendarSearch
              accountId={accountId}
              enabled={canQuery}
              value={search}
              onChange={setSearch}
              selection={selectionByCalendar}
              ownAddress={mailboxAddress}
              onPick={(event) => {
                setCursor(startOfDay(event.start));
                openEdit(event);
              }}
            />
            <TaskProjectFilter
              quiet
              projects={projectOptions}
              value={projectFilter.map((project) => project.id)}
              onChange={(ids) =>
                setProjectFilter(projectOptions.filter((project) => ids.includes(project.id)))
              }
              emptyMessage="No event here is linked to a project yet. Link one under Linked items."
            />
            <CalendarPickerMenu
              accountId={accountId}
              selection={selection}
              mailboxAddress={mailboxAddress}
              loading={selectionLoading}
              onManage={() => setOnboardingOpen(true)}
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="h-9 gap-1.5 px-3"
              disabled={writableCalendars.length === 0}
              onClick={() => openCreate()}
            >
              <CalendarPlus aria-hidden="true" className="size-4" />
              New event
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-muted/40">
          {showEmptySelection ? (
            <SelectionRequiredState onOpenOnboarding={() => setOnboardingOpen(true)} />
          ) : showEventsSkeleton ? (
            <CalendarBodySkeleton />
          ) : showEventsError ? (
            <EventsErrorState onRetry={() => void eventsQuery.refetch()} />
          ) : (
            <>
              {view === 'month' && (
                <EmailCalendarMonthView
                  cursor={cursor}
                  events={visibleEvents}
                  onSelectDay={setCursor}
                  onSwitchView={setView}
                  onEditEvent={openEdit}
                  onDeleteEvent={remove}
                />
              )}
              {view === 'week' && (
                <EmailCalendarWeekView
                  cursor={cursor}
                  events={visibleEvents}
                  onEdit={openEdit}
                  onDuplicate={duplicate}
                  onDelete={remove}
                  onToggleDone={toggleDone}
                  onCreateSlot={openCreate}
                />
              )}
              {view === 'day' && (
                <EmailCalendarDayView
                  cursor={cursor}
                  events={visibleEvents}
                  onEdit={openEdit}
                  onDuplicate={duplicate}
                  onDelete={remove}
                  onToggleDone={toggleDone}
                  onCreateSlot={openCreate}
                />
              )}
            </>
          )}
        </div>
      </div>

      <EmailCalendarEventDialog
        accountId={accountId ?? undefined}
        open={dialogState.open}
        onOpenChange={(open) => {
          setDialogState((current) => ({
            ...current,
            open,
            editing: open ? current.editing : null,
            template: open ? current.template : null,
          }));
        }}
        event={dialogState.editing}
        template={dialogState.template}
        writableCalendars={writableCalendars}
        initialStart={dialogState.initialStart}
        defaultCalendarId={defaultCalendarIdFor(writableCalendars, calendarsQuery.data)}
        onSubmit={handleDialogSubmit}
        onDelete={handleDialogDelete}
        submitting={createMutation.isPending || savingEdit}
        deleting={deleteMutation.isPending}
      />

      <EmailCalendarOnboardingDialog
        accountId={accountId}
        mailboxAddress={mailboxAddress}
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
      />
    </section>
  );
}

// ------------------------------------------------------------------------

/**
 * The period on screen, which is also where Day, Week and Month are chosen:
 * one control instead of a title beside a three-way switch.
 */
function PeriodMenu({
  label,
  view,
  onChange,
}: {
  label: string;
  view: CalendarView;
  onChange: (view: CalendarView) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}. Change calendar view`}
          className="ml-1 flex h-9 min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-base font-semibold tracking-tight text-foreground transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
        >
          <span className="truncate">{label}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {VIEW_TABS.map((tab) => (
          <DropdownMenuItem
            key={tab.id}
            className="cursor-pointer justify-between"
            onSelect={() => onChange(tab.id)}
          >
            {tab.label}
            {view === tab.id ? <Check aria-hidden="true" className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function EmptyCalendarState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 px-6 py-12">
      <div className="max-w-md rounded-lg border border-border bg-background px-6 py-8 text-center">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function SelectionRequiredState({ onOpenOnboarding }: { onOpenOnboarding: () => void }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-lg border border-border bg-background px-6 py-8 text-center">
        <h3 className="text-base font-semibold text-foreground">Pick your calendars</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't picked any calendars for this mailbox yet.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={onOpenOnboarding}
        >
          Choose calendars
        </Button>
      </div>
    </div>
  );
}

function EventsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
        <h3 className="text-base font-semibold text-foreground">Couldn't load events</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong reading the calendar. Try again.
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

// Full-height skeleton that echoes the real week grid: 64px hour-rail column +
// 7 day columns with a header row and a rail of hour rows filling the viewport.
// Uses `flex flex-col` on the outer container and `flex-1` on the body so the
// skeleton stretches with the calendar instead of leaving a large empty area
// below fixed-height rectangles.
function CalendarBodySkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border px-3 pb-2 pt-2">
        <span />
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-1 px-1">
            <Skeleton className="h-2 w-8" />
            <Skeleton className="h-5 w-10" />
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[64px_repeat(7,minmax(0,1fr))]">
        <div className="flex flex-col justify-between border-r border-border py-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="mx-2 h-2 w-8 opacity-70" aria-hidden="true" />
          ))}
        </div>
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <div
            key={dayIndex}
            className="flex flex-col gap-2 border-r border-border px-2 py-3 last:border-r-0"
          >
            {Array.from({ length: dayIndex % 2 === 0 ? 3 : 2 }).map((_, blockIndex) => (
              <Skeleton
                key={blockIndex}
                className={cn(
                  'w-full opacity-70',
                  blockIndex === 0 ? 'h-16' : blockIndex === 1 ? 'h-10' : 'h-8'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- helpers --------------------------------------------------------------

function queryRangeFor(view: CalendarView, cursor: Date): { from: string; to: string } {
  if (view === 'day') {
    const start = startOfDay(cursor);
    const end = addDays(start, 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (view === 'week') {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    const end = addDays(endOfWeek(cursor, { weekStartsOn: 0 }), 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  // month — include the surrounding weeks so the grid can render leading/
  // trailing days without a second fetch.
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const start = startOfWeek(monthStart, { weekStartsOn: 0 });
  const end = addDays(endOfWeek(monthEnd, { weekStartsOn: 0 }), 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function defaultCreateSlot(): Date {
  const now = new Date();
  return setMinutes(setHours(startOfDay(now), now.getHours() + 1), 0);
}

function defaultCalendarIdFor(
  writableCalendars: CalendarSelectionRow[],
  calendars: CalendarSummary[] | undefined
): string | undefined {
  const primary =
    writableCalendars.find((cal) => cal.isPrimary)?.aurinkoCalendarId ??
    calendars?.find((cal) => cal.isPrimary && !cal.readOnly && cal.selected)?.id;
  return primary ?? writableCalendars[0]?.aurinkoCalendarId;
}

function formatPeriodLabel(cursor: Date, view: CalendarView): string {
  if (view === 'day') return format(cursor, 'EEEE, MMMM d, yyyy');
  if (view === 'month') return format(cursor, 'MMMM yyyy');
  const weekStart = startOfWeek(cursor, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(cursor, { weekStartsOn: 0 });
  if (isSameMonth(weekStart, weekEnd))
    return `${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'd, yyyy')}`;
  if (isSameYear(weekStart, weekEnd))
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
  return `${format(weekStart, 'MMM d, yyyy')} – ${format(weekEnd, 'MMM d, yyyy')}`;
}
