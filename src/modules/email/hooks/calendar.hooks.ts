import { useCallback } from 'react';

import { shouldRetryQuery } from '@/app/lib/query-retry';
import { toastApiError } from '@/app/lib/toast-api-error';
import {
  calendarApi,
  type CalendarAnnotation,
  type CalendarEventEmailLink,
  type CalendarEventRecord,
  type CalendarSelectionRow,
  type CalendarSummary,
  type CreateCalendarEventInput,
  type ListCalendarEventsQuery,
  type SaveCalendarSelectionInput,
  type SetCalendarEventColorInput,
  type UpdateCalendarEventInput,
} from '@/modules/email/api';
import { emailActivityKeys } from '@/modules/email/constants/email-activity.keys';
import { withEventColor } from '@/modules/email/lib/calendar-event-colors';
import {
  withCalendarHidden,
  withoutCalendarEvents,
  withSummaryHidden,
} from '@/modules/email/lib/calendar-visibility';
import { shouldRetryEmailRequest } from '@/modules/email/lib/email-errors';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
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
  /** Events made from mail and the mail they came from (elli-ui#1305). */
  linksRoot: () => [...calendarKeys.all, 'email-links'] as const,
  threadEvents: (accountId?: string, conversationKey?: string | null) =>
    [...calendarKeys.linksRoot(), 'thread', accountId, conversationKey ?? null] as const,
  eventEmails: (accountId?: string, calendarId?: string, eventId?: string) =>
    [...calendarKeys.linksRoot(), 'event', accountId, calendarId, eventId] as const,
  eventLinks: (accountId?: string, calendarId?: string, eventId?: string) =>
    [...calendarKeys.linksRoot(), 'event-links', accountId, calendarId, eventId] as const,
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

/**
 * Loads what the event dialog's calendar picker needs, into the same entries
 * `useCalendarSelectionQuery` and `useCalendarListQuery` read — so a dialog
 * opened a moment later finds them already there.
 */
export function prefetchCalendarPicker(queryClient: QueryClient, accountId: string) {
  void queryClient.prefetchQuery({
    queryKey: calendarKeys.selection(accountId),
    queryFn: () => calendarApi.getSelection(accountId),
    staleTime: CALENDAR_METADATA_STALE_TIME_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: calendarKeys.calendars(accountId),
    queryFn: () => calendarApi.listCalendars(accountId),
    staleTime: CALENDAR_METADATA_STALE_TIME_MS,
  });
}

/** The events made from one thread — the details panel's "Calendar events". */
export const useThreadCalendarEventsQuery = (
  accountId: string | undefined,
  conversationKey: string | null | undefined,
  enabled = true
) =>
  useQuery<CalendarEventEmailLink[]>({
    queryKey: calendarKeys.threadEvents(accountId, conversationKey),
    queryFn: () => calendarApi.listThreadEvents(accountId!, conversationKey!),
    enabled: enabled && Boolean(accountId && conversationKey),
    staleTime: CALENDAR_METADATA_STALE_TIME_MS,
    gcTime: CALENDAR_CACHE_TIME_MS,
    retry: shouldRetryEmailRequest,
  });

/** The threads an event was made from — "Linked emails" in the event dialog. */
/** An event's emails and records, for the event modal (elli-ui#1379). */
export const useCalendarEventLinksQuery = (
  input: { accountId?: string; calendarId?: string; eventId?: string },
  enabled = true
) =>
  useQuery({
    queryKey: calendarKeys.eventLinks(input.accountId, input.calendarId, input.eventId),
    queryFn: () =>
      calendarApi.getEventLinks({
        accountId: input.accountId!,
        calendarId: input.calendarId!,
        eventId: input.eventId!,
      }),
    enabled: enabled && Boolean(input.accountId && input.calendarId && input.eventId),
    staleTime: 30 * 1000,
  });

/** Saves the event modal's emails and records, replacing what the event had. */
export const useSetCalendarEventLinksMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof calendarApi.setEventLinks>[0]) =>
      calendarApi.setEventLinks(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.linksRoot() });
      // The events list carries each event's projects, which follow its links.
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
    onError: (error) => toastApiError(error, 'Could not save the linked emails and items.'),
  });
};

export const useCalendarEventEmailsQuery = (
  input: { accountId?: string; calendarId?: string; eventId?: string },
  enabled = true
) =>
  useQuery<CalendarEventEmailLink[]>({
    queryKey: calendarKeys.eventEmails(input.accountId, input.calendarId, input.eventId),
    queryFn: () =>
      calendarApi.listEventEmails({
        accountId: input.accountId!,
        calendarId: input.calendarId!,
        eventId: input.eventId!,
      }),
    enabled: enabled && Boolean(input.accountId && input.calendarId && input.eventId),
    staleTime: CALENDAR_METADATA_STALE_TIME_MS,
    gcTime: CALENDAR_CACHE_TIME_MS,
    retry: shouldRetryEmailRequest,
  });

export const useUnlinkThreadEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { accountId: string; linkId: string }) =>
      calendarApi.unlinkThreadEvent(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: calendarKeys.linksRoot() }),
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

/**
 * Show or hide one calendar from the picker (elli-ui#1240).
 *
 * - **Queued, not locked.** Toggles share a mutation scope, so their requests
 *   reach the server in the order they were clicked, while each checkbox still
 *   flips the moment it is clicked (`onMutate` runs before a queued request
 *   starts). The picker used to disable every checkbox until a toggle settled.
 * - **Settles on the write, not the re-read.** `onSettled` used to await a
 *   refetch of every selected calendar — a live provider read that took
 *   seconds — and the toggle stayed pending, and the picker frozen, for all of
 *   it. Hiding now drops the calendar's events from the cache with no request;
 *   showing refetches in the background.
 * - **Retried once.** The write is idempotent (it sets `hidden` to a value), so
 *   a gateway blip in front of the API — the 502 in the issue — is safe to ask
 *   again before the tick snaps back.
 */
export const useSetCalendarVisibilityMutation = () => {
  const queryClient = useQueryClient();

  const applyHidden = (accountId: string, calendarId: string, hidden: boolean) => {
    queryClient.setQueryData<CalendarSelectionRow[]>(calendarKeys.selection(accountId), (rows) =>
      withCalendarHidden(rows, calendarId, hidden)
    );
    queryClient.setQueryData<CalendarSummary[]>(calendarKeys.calendars(accountId), (calendars) =>
      withSummaryHidden(calendars, calendarId, hidden)
    );
  };

  return useMutation({
    scope: { id: 'calendar-visibility' },
    retry: shouldRetryQuery,
    mutationFn: (input: { accountId: string; calendarId: string; hidden: boolean }) =>
      calendarApi.setVisibility(input),
    onMutate: async (input) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: calendarKeys.selection(input.accountId) }),
        queryClient.cancelQueries({ queryKey: calendarKeys.calendars(input.accountId) }),
      ]);
      applyHidden(input.accountId, input.calendarId, input.hidden);

      if (input.hidden) {
        // An in-flight read could land after this and put the events back.
        await queryClient.cancelQueries({ queryKey: calendarKeys.eventsRoot(input.accountId) });
        queryClient.setQueriesData<CalendarEventRecord[]>(
          { queryKey: calendarKeys.eventsRoot(input.accountId) },
          (events) => withoutCalendarEvents(events, input.calendarId)
        );
      }
    },
    onSuccess: (_row, input) => {
      if (!input.hidden) {
        void queryClient.invalidateQueries({ queryKey: calendarKeys.eventsRoot(input.accountId) });
      }
    },
    onError: (error, input) => {
      applyHidden(input.accountId, input.calendarId, !input.hidden);
      // A failed hide already took the events off screen; read them back.
      if (input.hidden) {
        void queryClient.invalidateQueries({ queryKey: calendarKeys.eventsRoot(input.accountId) });
      }
      toastApiError(error, 'Could not update calendar visibility. Try again.');
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
      void queryClient.invalidateQueries({ queryKey: calendarKeys.linksRoot() });
      // The thread timelines show the event's line, which follows it.
      void queryClient.invalidateQueries({ queryKey: emailActivityKeys.all });
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
      void queryClient.invalidateQueries({ queryKey: calendarKeys.linksRoot() });
      // The thread timelines show the event's line, which follows it.
      void queryClient.invalidateQueries({ queryKey: emailActivityKeys.all });
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
      void queryClient.invalidateQueries({ queryKey: calendarKeys.linksRoot() });
      // The thread timelines show the event's line, which follows it.
      void queryClient.invalidateQueries({ queryKey: emailActivityKeys.all });
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

/**
 * Give one event its own color, or put it back on its calendar's (elli-ui#830).
 * Optimistic across every loaded window, like `done`: the color is a private
 * overlay the server only stores, so there is nothing to wait for. A failure
 * restores the snapshots.
 */
export const useSetCalendarEventColorMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetCalendarEventColorInput) => calendarApi.setColor(input),
    onMutate: async (input): Promise<ToggleDoneSnapshot> => {
      await queryClient.cancelQueries({ queryKey: calendarKeys.eventsRoot(input.accountId) });
      const snapshots = queryClient.getQueriesData<CalendarEventRecord[]>({
        queryKey: calendarKeys.eventsRoot(input.accountId),
      });
      queryClient.setQueriesData<CalendarEventRecord[]>(
        { queryKey: calendarKeys.eventsRoot(input.accountId) },
        (current) => withEventColor(current, input.calendarId, input.eventId, input.color)
      );
      return snapshots;
    },
    onError: (error, _input, snapshot) => {
      for (const [queryKey, events] of snapshot ?? []) {
        queryClient.setQueryData(queryKey, events);
      }
      toastApiError(error, 'Failed to change the event color.');
    },
  });
};

/**
 * Saves an edited event: the provider write when its details changed, the
 * color write when its color did, side by side. A color-only edit never
 * touches the provider. `onSaved` runs once every write has landed; each
 * mutation toasts its own failure, so a rejection needs nothing more here.
 */
export const useSaveCalendarEventEdit = () => {
  const { mutateAsync: updateEvent, isPending: updating } = useUpdateCalendarEventMutation();
  const { mutateAsync: setColor, isPending: coloring } = useSetCalendarEventColorMutation();

  const save = useCallback(
    (
      input: { update?: UpdateCalendarEventInput; color?: SetCalendarEventColorInput },
      onSaved: () => void
    ) => {
      const writes: Promise<unknown>[] = [];
      if (input.update) writes.push(updateEvent(input.update));
      if (input.color) writes.push(setColor(input.color));
      Promise.all(writes).then(onSaved, () => undefined);
    },
    [setColor, updateEvent]
  );

  return { save, isPending: updating || coloring };
};
