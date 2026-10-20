import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { useAccess } from '@/app/contexts/access-context';
import { toastApiError } from '@/app/lib/toast-api-error';
import { calendarApi, type CalendarEventEmailLink } from '@/modules/email/api';
import {
  EmailCalendarEventDialog,
  type CalendarEventDialogSubmit,
} from '@/modules/email/components/calendar/email-calendar-event-dialog';
import {
  toCalendarEvent,
  type CalendarEvent,
} from '@/modules/email/components/calendar/email-calendar-types';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { MailThreadEvents } from '@/modules/email/components/mail-thread-events';
import {
  calendarKeys,
  prefetchCalendarPicker,
  useCalendarListQuery,
  useCalendarSelectionQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useSaveCalendarEventEdit,
  useSetCalendarEventLinksMutation,
  useThreadCalendarEventsQuery,
  useUnlinkThreadEventMutation,
} from '@/modules/email/hooks/calendar.hooks';
import { isEventGone } from '@/modules/email/lib/calendar-event-errors';
import { serializeEventDate } from '@/modules/email/lib/calendar-event-form';
import { toEventLinkInputs } from '@/modules/email/lib/event-modal-links';
import {
  threadEventPrefill,
  writableCalendarOptions,
} from '@/modules/email/lib/thread-calendar-events';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * A date written in an email (elli-ui#686): when, and which message of the
 * thread it was written in — the one the new event links to.
 */
type CreateAt = { start: Date; hasTime: boolean; providerId?: string };

type DialogState =
  | { open: false }
  | { open: true; mode: 'create'; at?: CreateAt }
  | { open: true; mode: 'edit'; event: CalendarEvent };

/**
 * "Calendar events" in a thread's details panel (elli-ui#1305): the "+ Add
 * event" link, the list of events made from the thread, and the dialog both
 * open — the same dialog the Calendar tab uses, so an event made here is the
 * same as one made there.
 *
 * The calendars are only fetched once the dialog opens: most threads are read
 * and never turned into an event, and the panel already costs a request for
 * its own list.
 */
export function useThreadCalendarEvents({
  accountId,
  email,
  enabled,
}: {
  accountId: string | undefined;
  email: EmailListItem | null;
  /** Calendar is Outlook-only today; off for any other mailbox. */
  enabled: boolean;
}): {
  addEvent: ReactNode;
  section: ReactNode;
  dialog: ReactNode;
  /**
   * Opens "New event" at a date written in the email (elli-ui#686). Absent
   * without calendar write access, so the body then marks no dates at all.
   */
  createAt: ((at: CreateAt) => void) | undefined;
} | null {
  const { can } = useAccess();
  const canRead = enabled && can('calendar', 'read');
  const canWrite = canRead && can('calendar', 'write');
  const conversationKey = email?.conversationKey ?? email?.threadId ?? null;
  const providerId = email ? (email.providerId ?? email.id) : null;

  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [openingId, setOpeningId] = useState<string | null>(null);

  const eventsQuery = useThreadCalendarEventsQuery(accountId, conversationKey, canRead);
  const selectionQuery = useCalendarSelectionQuery(accountId, canRead && dialog.open);
  const calendarsQuery = useCalendarListQuery(accountId, canRead && dialog.open);
  const createMutation = useCreateCalendarEventMutation();
  const { save: saveEdit, isPending: savingEdit } = useSaveCalendarEventEdit();
  const deleteMutation = useDeleteCalendarEventMutation();
  const unlinkMutation = useUnlinkThreadEventMutation();
  const setLinksMutation = useSetCalendarEventLinksMutation();

  const writableCalendars = useMemo(
    () => writableCalendarOptions(selectionQuery.data, calendarsQuery.data),
    [calendarsQuery.data, selectionQuery.data]
  );
  // The mailbox's own primary calendar unless the reader picks another. The
  // dialog re-seeds when this arrives, so a calendar list that lands a moment
  // after the dialog opens still fills the picker instead of leaving it blank.
  const defaultCalendarId =
    writableCalendars.find((row) => row.isPrimary)?.aurinkoCalendarId ??
    writableCalendars[0]?.aurinkoCalendarId;
  const prefill = useMemo(() => (email ? threadEventPrefill(email) : null), [email]);

  /** Starts loading the calendars as the pointer reaches "+ Add event". */
  const warmCalendars = useCallback(() => {
    if (accountId) prefetchCalendarPicker(queryClient, accountId);
  }, [accountId, queryClient]);
  const close = useCallback(() => setDialog({ open: false }), []);

  /**
   * Opens a linked event, read back from the provider by its own id — never
   * through the calendar list, which only answers for calendars the reader has
   * picked and only for the day the link last saw the event on. Going through
   * it, a reader who had never picked calendars (or an event moved to another
   * day) was told the event was gone and the link was dropped.
   *
   * A link is never dropped behind the reader's back. Even a 404 — the event
   * really was deleted in Outlook — only offers to remove it.
   */
  const openLinked = useCallback(
    async (link: CalendarEventEmailLink) => {
      if (!accountId) return;
      setOpeningId(link.id);
      try {
        const record = await calendarApi.getEvent({
          accountId,
          calendarId: link.calendarId,
          eventId: link.eventId,
        });
        // The server refreshed the link's copy of the title and date on the way.
        void queryClient.invalidateQueries({ queryKey: calendarKeys.linksRoot() });
        const event = toCalendarEvent(record, new Map());
        if (!event) {
          toast.error('Could not read that event. Open it in the Calendar tab instead.');
          return;
        }
        setDialog({ open: true, mode: 'edit', event });
      } catch (error) {
        if (isEventGone(error)) {
          toast.info('This event was deleted from the calendar.', {
            action: {
              label: 'Remove link',
              onClick: () => unlinkMutation.mutate({ accountId, linkId: link.id }),
            },
          });
          return;
        }
        toastApiError(error, 'Could not open the event. Try again.');
      } finally {
        setOpeningId(null);
      }
    },
    [accountId, queryClient, unlinkMutation]
  );

  const submit = useCallback(
    (input: CalendarEventDialogSubmit, editingId: string | null) => {
      if (!accountId || !email || !providerId) return;
      if (input.mode === 'create') {
        createMutation.mutate(
          {
            accountId,
            // Empty when there was no calendar to pick: the server then saves
            // it to the mailbox's primary calendar rather than refusing it.
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
          },
          { onSuccess: close }
        );
        return;
      }
      if (dialog.open && dialog.mode === 'edit' && editingId) {
        const target = { accountId, calendarId: dialog.event.calendarId, eventId: editingId };
        if (input.links) setLinksMutation.mutate({ ...target, ...toEventLinkInputs(input.links) });
        if (!input.detailsChanged && input.color === undefined) {
          if (input.links) close();
          return;
        }
        saveEdit(
          {
            update: input.detailsChanged
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
              : undefined,
            color: input.color !== undefined ? { ...target, color: input.color } : undefined,
          },
          close
        );
      }
    },
    [accountId, close, createMutation, dialog, email, providerId, saveEdit, setLinksMutation]
  );

  const remove = useCallback(
    (event: CalendarEvent, target: 'occurrence' | 'series') => {
      if (!accountId) return;
      const eventId = target === 'series' && event.seriesMasterId ? event.seriesMasterId : event.id;
      deleteMutation.mutate(
        { accountId, calendarId: event.calendarId, eventId },
        { onSuccess: close }
      );
    },
    [accountId, close, deleteMutation]
  );

  if (!canRead || !accountId || !email || !conversationKey) return null;

  const editing = dialog.open && dialog.mode === 'edit' ? dialog.event : null;
  const creatingAt = dialog.open && dialog.mode === 'create' ? dialog.at : undefined;

  return {
    addEvent: canWrite ? (
      <button
        type="button"
        className="cursor-pointer text-[13px] font-medium text-link hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        onPointerEnter={warmCalendars}
        onFocus={warmCalendars}
        onClick={() => setDialog({ open: true, mode: 'create' })}
      >
        + Add event
      </button>
    ) : null,
    section: eventsQuery.isError ? (
      <p className="pb-1 text-[12.5px] text-mail-muted">Couldn’t load this thread’s events.</p>
    ) : (
      <MailThreadEvents
        events={eventsQuery.data ?? []}
        openingId={openingId}
        onOpen={(link) => void openLinked(link)}
      />
    ),
    dialog: (
      <EmailCalendarEventDialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        accountId={accountId}
        event={editing}
        writableCalendars={writableCalendars}
        defaultCalendarId={dialog.open && dialog.mode === 'create' ? defaultCalendarId : undefined}
        initialStart={creatingAt?.start}
        prefill={
          dialog.open && dialog.mode === 'create' && prefill
            ? // A date written without a time is a whole day.
              { ...prefill, allDay: creatingAt ? !creatingAt.hasTime : prefill.allDay }
            : null
        }
        initialEmails={
          dialog.open && dialog.mode === 'create' && providerId
            ? [
                {
                  accountId,
                  // The message the date was written in, when the event came
                  // from one; otherwise the email open in the pane.
                  providerId: dialog.at?.providerId || providerId,
                  conversationKey: email.conversationKey ?? null,
                  threadId: email.threadId ?? null,
                  subject: email.subject ?? null,
                  fromEmail: email.senderEmail ?? null,
                  fromName: email.senderName ?? null,
                  receivedAt: email.receivedAt ?? null,
                },
              ]
            : undefined
        }
        onSubmit={submit}
        onDelete={canWrite ? remove : undefined}
        submitting={createMutation.isPending || savingEdit}
        deleting={deleteMutation.isPending}
      />
    ),
    createAt: canWrite
      ? (at) => {
          warmCalendars();
          setDialog({ open: true, mode: 'create', at });
        }
      : undefined,
  };
}
