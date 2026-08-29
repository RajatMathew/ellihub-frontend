import { toastApiError } from '@/app/lib/toast-api-error';
import {
  calendarApi,
  type CalendarAnnotation,
  type CalendarEventRecord,
  type CalendarSelectionRow,
  type CalendarSummary,
  type CreateCalendarEventInput,
  type ListCalendarEventsQuery,
  type SaveCalendarSelectionInput,
  type UpdateCalendarEventInput,
} from '@/modules/email/api';
import { shouldRetryEmailRequest } from '@/modules/email/lib/email-errors';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const CALENDAR_METADATA_STALE_TIME_MS = 5 * 60 * 1000;
// Events change behind our back (deleted/moved in Outlook), so the freshness
// window is short — it only exists to dedupe rapid view flips, not to cache.
const CALENDAR_EVENTS_STALE_TIME_MS = 15 * 1000;
const CALENDAR_CACHE_TIME_MS = 15 * 60 * 1000;

export const calendarKeys = {
  all: ['connected-email', 'calendar'] as const,
  calendars: (accountId?: string) => [...calendarKeys.all, 'calendars', accountId] as const,
  selection: (accountId?: string) => [...calendarKeys.all, 'selection', accountId] as const,
  eventsRoot: (accountId?: string) => [...calendarKeys.all, 'events', accountId] as const,
  events: (accountId?: string, from?: string, to?: string, calendarIds?: readonly string[]) =>
    [...calendarKeys.eventsRoot(accountId), from, to, calendarIds ?? null] as const,
};

export const useCalendarListQuery = (accountId: string | undefined, enabled = true) =>
  useQuery<CalendarSummary[]>({
    queryKey: calendarKeys.calendars(accountId),
    queryFn: () => calendarApi.listCalendars(accountId!),
    enabled: enabled && Boolean(accountId),
    staleTime: CALENDAR_METADATA_STALE_TIME_MS,
    gcTime: CALENDAR_CACHE_TIME_MS,
    retry: shouldRetryEmailRequest,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useCalendarSelectionQuery = (accountId: string | undefined, enabled = true) =>
  useQuery<CalendarSelectionRow[]>({
    queryKey: calendarKeys.selection(accountId),
    queryFn: () => calendarApi.getSelection(accountId!),
    enabled: enabled && Boolean(accountId),
    staleTime: CALENDAR_METADATA_STALE_TIME_MS,
    gcTime: CALENDAR_CACHE_TIME_MS,
    retry: shouldRetryEmailRequest,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

// The events query is keyed by (accountId, from, to, calendarIds) so the
// calendar can page forward/back without the previous window's data lingering.
// Pass `calendarIds` when the server should filter beyond the current
// selection — omit it to let the server default to all selected non-hidden.
export const useCalendarEventsQuery = (
  params: Omit<ListCalendarEventsQuery, 'signal'> | { accountId?: undefined },
  enabled = true
) => {
  const accountId = 'accountId' in params ? params.accountId : undefined;
  const from = 'from' in params ? params.from : undefined;
  const to = 'to' in params ? params.to : undefined;
  const calendarIds = 'calendarIds' in params ? params.calendarIds : undefined;

  return useQuery<CalendarEventRecord[]>({
    queryKey: calendarKeys.events(accountId, from, to, calendarIds),
    queryFn: ({ signal }) =>
      calendarApi.listEvents({
        accountId: accountId!,
        from: from!,
        to: to!,
        calendarIds,
        signal,
      }),
    enabled: enabled && Boolean(accountId && from && to),
    staleTime: CALENDAR_EVENTS_STALE_TIME_MS,
    gcTime: CALENDAR_CACHE_TIME_MS,
    // Paging to another week keeps the current grid on screen while the new
    // window loads — the views show a subtle fetching indicator instead of
    // flashing a skeleton.
    placeholderData: keepPreviousData,
    retry: shouldRetryEmailRequest,
    // Always refetch when the calendar view opens, and when the window regains
    // focus (e.g. the user just deleted an event in Outlook and tabbed back) —
    // Aurinko is queried live, so one refresh must reflect provider changes.
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useSaveCalendarSelectionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveCalendarSelectionInput) => calendarApi.saveSelection(input),
    onSuccess: async (rows, input) => {
      queryClient.setQueryData<CalendarSelectionRow[]>(
        calendarKeys.selection(input.accountId),
        rows
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: calendarKeys.calendars(input.accountId),
        }),
        queryClient.invalidateQueries({
          queryKey: calendarKeys.eventsRoot(input.accountId),
        }),
      ]);
    },
    onError: (error) => toastApiError(error, 'Failed to save calendar selection.'),
  });
};

type VisibilitySnapshot = {
  selection: CalendarSelectionRow[] | undefined;
  calendars: CalendarSummary[] | undefined;
};

export const useSetCalendarVisibilityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { accountId: string; calendarId: string; hidden: boolean }) =>
      calendarApi.setVisibility(input),
    onMutate: async (input): Promise<VisibilitySnapshot> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: calendarKeys.selection(input.accountId) }),
        queryClient.cancelQueries({ queryKey: calendarKeys.calendars(input.accountId) }),
      ]);

      const selection = queryClient.getQueryData<CalendarSelectionRow[]>(
        calendarKeys.selection(input.accountId)
      );
      const calendars = queryClient.getQueryData<CalendarSummary[]>(
        calendarKeys.calendars(input.accountId)
      );

      queryClient.setQueryData<CalendarSelectionRow[]>(
        calendarKeys.selection(input.accountId),
        (current) =>
          current?.map((row) =>
            row.aurinkoCalendarId === input.calendarId ? { ...row, hidden: input.hidden } : row
          )
      );
      queryClient.setQueryData<CalendarSummary[]>(
        calendarKeys.calendars(input.accountId),
        (current) =>
          current?.map((cal) =>
            cal.id === input.calendarId ? { ...cal, hidden: input.hidden } : cal
          )
      );

      return { selection, calendars };
    },
    onError: (error, input, snapshot) => {
      queryClient.setQueryData(calendarKeys.selection(input.accountId), snapshot?.selection);
      queryClient.setQueryData(calendarKeys.calendars(input.accountId), snapshot?.calendars);
      toastApiError(error, 'Failed to update calendar visibility.');
    },
    onSettled: async (_result, _error, input) => {
      await queryClient.invalidateQueries({
        queryKey: calendarKeys.eventsRoot(input.accountId),
      });
    },
  });
};

export const useCreateCalendarEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => calendarApi.createEvent(input),
    onSuccess: async (_event, input) => {
      await queryClient.invalidateQueries({
        queryKey: calendarKeys.eventsRoot(input.accountId),
      });
      toast.success('Event created.');
    },
    onError: (error) => toastApiError(error, 'Failed to create event.'),
  });
};

export const useUpdateCalendarEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCalendarEventInput) => calendarApi.updateEvent(input),
    onSuccess: async (_event, input) => {
      await queryClient.invalidateQueries({
        queryKey: calendarKeys.eventsRoot(input.accountId),
      });
      toast.success('Event updated.');
    },
    onError: (error) => toastApiError(error, 'Failed to update event.'),
  });
};

export const useDeleteCalendarEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { accountId: string; calendarId: string; eventId: string }) =>
      calendarApi.deleteEvent(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: calendarKeys.eventsRoot(input.accountId),
      });
      toast.success('Event deleted.');
    },
    onError: (error) => toastApiError(error, 'Failed to delete event.'),
  });
};

type ToggleDoneSnapshot = Array<[readonly unknown[], CalendarEventRecord[] | undefined]>;

// Optimistically flip `done` across every cached event page for the account so
// the checkmark responds instantly. A rollback restores every snapshot. The
// server returns the annotation row, not the whole event, so we don't set the
// event from the response — we invalidate on settle.
export const useSetCalendarEventDoneMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      accountId: string;
      calendarId: string;
      eventId: string;
      done: boolean;
    }) => calendarApi.setDone(input),
    onMutate: async (input): Promise<ToggleDoneSnapshot> => {
      await queryClient.cancelQueries({
        queryKey: calendarKeys.eventsRoot(input.accountId),
      });

      const snapshots = queryClient.getQueriesData<CalendarEventRecord[]>({
        queryKey: calendarKeys.eventsRoot(input.accountId),
      });

      const doneAt = input.done ? new Date().toISOString() : null;
      queryClient.setQueriesData<CalendarEventRecord[]>(
        { queryKey: calendarKeys.eventsRoot(input.accountId) },
        (current) =>
          current?.map((event) =>
            event.id === input.eventId && event.calendarId === input.calendarId
              ? { ...event, done: input.done, doneAt }
              : event
          )
      );

      return snapshots;
    },
    onSuccess: (annotation: CalendarAnnotation, input) => {
      queryClient.setQueriesData<CalendarEventRecord[]>(
        { queryKey: calendarKeys.eventsRoot(input.accountId) },
        (current) =>
          current?.map((event) =>
            event.id === input.eventId && event.calendarId === input.calendarId
              ? { ...event, done: annotation.done, doneAt: annotation.doneAt }
              : event
          )
      );
    },
    onError: (error, _input, snapshot) => {
      for (const [queryKey, events] of snapshot ?? []) {
        queryClient.setQueryData(queryKey, events);
      }
      toastApiError(error, 'Failed to update event status.');
    },
  });
};
