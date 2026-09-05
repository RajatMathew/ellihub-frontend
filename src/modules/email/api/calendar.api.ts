import api from '@/app/api';
import { z } from 'zod';

const BASE = '/email/calendars';

// A calendar as returned by GET /:accountId. The `selected` and `hidden` flags
// are the client's per-user overlay — they let the sidebar render the picker
// and the eye toggle from a single call.
const calendarSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isPrimary: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  color: z.string().optional(),
  selected: z.boolean(),
  hidden: z.boolean(),
});

// The selection row's natural key on the client is `aurinkoCalendarId` — the
// DB row id is not returned by the server since nothing on the client needs it.
const calendarSelectionRowSchema = z.object({
  aurinkoCalendarId: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  isPrimary: z.boolean(),
  hidden: z.boolean(),
});

const attendeeSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
});

const calendarEventSchema = z.object({
  id: z.string(),
  calendarId: z.string(),
  subject: z.string().nullable(),
  description: z.string().nullable(),
  start: z.string(),
  end: z.string(),
  isAllDay: z.boolean(),
  location: z.string().nullable(),
  organizer: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
    })
    .nullable(),
  // Setting this on create/update is what makes the provider (Graph) send
  // each attendee an invitation/update email — there's no separate "send
  // invite" call.
  attendees: z.array(attendeeSchema).default([]),
  webLink: z.string().nullable(),
  isOnlineMeeting: z.boolean().optional(),
  onlineMeetingUrl: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
  seriesMasterId: z.string().nullable().optional(),
  done: z.boolean(),
  doneAt: z.string().nullable(),
});

const calendarAnnotationSchema = z.object({
  aurinkoCalendarId: z.string(),
  aurinkoEventId: z.string(),
  done: z.boolean(),
  doneAt: z.string().nullable(),
});

export type CalendarAttendee = z.infer<typeof attendeeSchema>;
export type CalendarSummary = z.infer<typeof calendarSchema>;
export type CalendarSelectionRow = z.infer<typeof calendarSelectionRowSchema>;
export type CalendarEventRecord = z.infer<typeof calendarEventSchema>;
export type CalendarAnnotation = z.infer<typeof calendarAnnotationSchema>;

export type SaveCalendarSelectionInput = {
  accountId: string;
  calendars: Array<{
    aurinkoCalendarId: string;
    name: string;
    color?: string | null;
    isPrimary?: boolean;
  }>;
};

export type ListCalendarEventsQuery = {
  accountId: string;
  from: string;
  to: string;
  calendarIds?: string[];
  signal?: AbortSignal;
};

export type CalendarRecurrenceOption = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';

export type CreateCalendarEventInput = {
  accountId: string;
  calendarId: string;
  subject: string;
  description?: string;
  start: string;
  end: string;
  isAllDay?: boolean;
  location?: string;
  /** IANA zone the event is anchored to (defaults to the mailbox/browser zone). */
  timeZone?: string;
  /** Attach a Teams meeting. */
  isOnlineMeeting?: boolean;
  recurrence?: CalendarRecurrenceOption;
  /** Each one gets an invitation email from the provider automatically. */
  attendees?: Array<{ email: string; name?: string }>;
};

export type UpdateCalendarEventInput = {
  accountId: string;
  calendarId: string;
  eventId: string;
  subject?: string;
  description?: string;
  start?: string;
  end?: string;
  // Must accompany start/end — without it the server rewrites an all-day
  // event's {dateOnly} window as a timed {dateTime} one.
  isAllDay?: boolean;
  location?: string;
  /**
   * Full replacement list, not a diff — omit to leave attendees unchanged.
   * Newly-added addresses get an invitation email, removed ones get a
   * cancellation notice, both sent by the provider automatically.
   */
  attendees?: Array<{ email: string; name?: string }>;
};

function unwrapData<T>(data: unknown, key = 'data'): T {
  const response = data as Record<string, unknown>;
  return (response?.[key] ?? response) as T;
}

export const calendarApi = {
  async listCalendars(accountId: string): Promise<CalendarSummary[]> {
    const res = await api.get(`${BASE}/${accountId}`);
    return z.array(calendarSchema).parse(unwrapData(res.data));
  },

  async getSelection(accountId: string): Promise<CalendarSelectionRow[]> {
    const res = await api.get(`${BASE}/${accountId}/selection`);
    return z.array(calendarSelectionRowSchema).parse(unwrapData(res.data));
  },

  async saveSelection(input: SaveCalendarSelectionInput): Promise<CalendarSelectionRow[]> {
    const res = await api.put(`${BASE}/${input.accountId}/selection`, {
      calendars: input.calendars,
    });
    return z.array(calendarSelectionRowSchema).parse(unwrapData(res.data));
  },

  async setVisibility(input: {
    accountId: string;
    calendarId: string;
    hidden: boolean;
  }): Promise<CalendarSelectionRow> {
    const res = await api.patch(`${BASE}/${input.accountId}/${input.calendarId}/visibility`, {
      hidden: input.hidden,
    });
    return calendarSelectionRowSchema.parse(unwrapData(res.data));
  },

  async listEvents(query: ListCalendarEventsQuery): Promise<CalendarEventRecord[]> {
    const res = await api.get(`${BASE}/${query.accountId}/events`, {
      params: {
        from: query.from,
        to: query.to,
        calendarIds: query.calendarIds?.length ? query.calendarIds.join(',') : undefined,
      },
      signal: query.signal,
    });
    return z.array(calendarEventSchema).parse(unwrapData(res.data));
  },

  async createEvent(input: CreateCalendarEventInput): Promise<CalendarEventRecord> {
    const { accountId, ...body } = input;
    const res = await api.post(`${BASE}/${accountId}/events`, body);
    return calendarEventSchema.parse(unwrapData(res.data));
  },

  async updateEvent(input: UpdateCalendarEventInput): Promise<CalendarEventRecord> {
    const { accountId, calendarId, eventId, ...body } = input;
    const res = await api.patch(`${BASE}/${accountId}/${calendarId}/events/${eventId}`, body);
    return calendarEventSchema.parse(unwrapData(res.data));
  },

  async deleteEvent(input: {
    accountId: string;
    calendarId: string;
    eventId: string;
  }): Promise<void> {
    await api.delete(`${BASE}/${input.accountId}/${input.calendarId}/events/${input.eventId}`);
  },

  async setDone(input: {
    accountId: string;
    calendarId: string;
    eventId: string;
    done: boolean;
  }): Promise<CalendarAnnotation> {
    const res = await api.patch(
      `${BASE}/${input.accountId}/${input.calendarId}/events/${input.eventId}/done`,
      { done: input.done }
    );
    return calendarAnnotationSchema.parse(unwrapData(res.data));
  },
};
