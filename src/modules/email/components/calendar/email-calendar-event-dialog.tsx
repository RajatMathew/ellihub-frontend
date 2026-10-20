import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  FieldButton,
  FieldPopover,
  PickerOption,
  PropRow,
  RecordModal,
  RecordModalCompose,
  RecordModalFooter,
  RecordModalProps,
  RecordModalSeparator,
} from '@/app/components/record-modal';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Switch } from '@/app/components/ui/switch';
import { useResetOnChange } from '@/app/hooks/use-reset-on-change';
import { cn } from '@/app/lib/utils';
import type { CalendarRecurrenceOption, CalendarSelectionRow } from '@/modules/email/api';
import { EventColorPicker } from '@/modules/email/components/calendar/email-calendar-color-picker';
import {
  CALENDAR_EVENT_STYLES,
  colorForCalendar,
  type CalendarEvent,
  type CalendarEventColor,
} from '@/modules/email/components/calendar/email-calendar-types';
import { EventAttendeesField } from '@/modules/email/components/calendar/event-modal/event-attendees-field';
import { EventWhenField } from '@/modules/email/components/calendar/event-modal/event-when-field';
import { LinkedEmailsField } from '@/modules/email/components/record-links/linked-emails-field';
import { LinkedRecordsField } from '@/modules/email/components/record-links/linked-records-field';
import { useCalendarEventLinksQuery } from '@/modules/email/hooks/calendar.hooks';
import { useBringThreadRecords } from '@/modules/email/hooks/use-thread-linked-records';
import type { EventColorKey } from '@/modules/email/lib/calendar-event-colors';
import {
  allDayRange,
  allDaySpan,
  duplicateTitle,
  editedLocation,
  endsOnLaterDay,
  startsInPast,
  timedEnd,
} from '@/modules/email/lib/calendar-event-form';
import {
  EMAIL_ADDRESS_PATTERN,
  formatEmailAddress,
  parseEmailAddresses,
} from '@/modules/email/lib/email-addresses';
import { eventCalendarName } from '@/modules/email/lib/email-calendar-owner';
import { eventLinksChanged, eventLinksOf } from '@/modules/email/lib/event-modal-links';
import type { LinkedEmail, LinkedRecord } from '@/modules/email/lib/record-links';
import { useRecordLinkOptions } from '@/modules/tasks/hooks/use-record-link-options';
import { addMinutes, format, isSameDay, parse } from 'date-fns';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Link2,
  Mail,
  MapPin,
  Repeat,
  Trash2,
  Users,
  Video,
} from 'lucide-react';

const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

type RecurrenceValue = 'none' | CalendarRecurrenceOption;

export type CalendarEventDialogSubmit =
  | {
      mode: 'create';
      calendarId: string;
      subject: string;
      description?: string;
      start: Date;
      end: Date;
      isAllDay: boolean;
      location?: string;
      timeZone?: string;
      isOnlineMeeting?: boolean;
      recurrence?: CalendarRecurrenceOption;
      attendees?: Array<{ email: string; name?: string }>;
      /** The user's own color; omitted when the event follows its calendar. */
      color?: EventColorKey;
      /** The emails and records the event is about (elli-ui#1379). */
      emailLinks: LinkedEmail[];
      recordLinks: LinkedRecord[];
    }
  | {
      mode: 'edit';
      subject: string;
      description?: string;
      start: Date;
      end: Date;
      isAllDay: boolean;
      location?: string;
      attendees?: Array<{ email: string; name?: string }>;
      /** Anything besides the color and the links differs — the provider needs a write. */
      detailsChanged: boolean;
      /** Present only when the color changed; null returns it to the calendar's. */
      color?: EventColorKey | null;
      /** Present only when the emails or records changed: the whole new set. */
      links?: { emails: LinkedEmail[]; records: LinkedRecord[] };
    };

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Powers attendee suggestions and loads an edited event's links. */
  accountId?: string;
  /** null = create mode. Otherwise it's an edit. */
  event: CalendarEvent | null;
  /**
   * Create mode only: an event to start from. Duplicate opens the dialog this
   * way so the copy is reviewed before anything is created (elli-ui#1260).
   */
  template?: CalendarEvent | null;
  /** Selection rows (already filtered to writable calendars by the caller). */
  writableCalendars: CalendarSelectionRow[];
  /** Date/time to pre-fill in create mode. */
  initialStart?: Date;
  /** Which calendar to pre-select in create mode. */
  defaultCalendarId?: string;
  /** Create mode only: a mail thread's subject and sender (elli-ui#1305). */
  prefill?: EventPrefill | null;
  /** Create mode only: the emails a new event starts out linked to — the thread it came from. */
  initialEmails?: LinkedEmail[];
  /** Anything a caller adds under the fields. */
  children?: ReactNode;
  /** Create mode only: beside "New event", e.g. a tag saying Elliot filed the thread it is from. */
  titleAside?: ReactNode;
  onSubmit: (input: CalendarEventDialogSubmit, editingId: string | null) => void;
  /** `target` is 'series' only when the user chose "Delete the series". */
  onDelete?: (event: CalendarEvent, target: 'occurrence' | 'series') => void;
  submitting?: boolean;
  deleting?: boolean;
}

/**
 * Making or editing a calendar event (elli-ui#1379): the title and notes on
 * the sheet, then calendar, when, repeat, Teams, attendees and location, then
 * the emails and records the event is about.
 */
export function EmailCalendarEventDialog({
  open,
  onOpenChange,
  accountId,
  event,
  template = null,
  writableCalendars,
  initialStart,
  defaultCalendarId,
  prefill = null,
  initialEmails,
  children,
  titleAside,
  onSubmit,
  onDelete,
  submitting = false,
  deleting = false,
}: CalendarEventDialogProps) {
  const seed = useMemo(
    () => buildSeed(event, template, initialStart, defaultCalendarId, writableCalendars, prefill),
    // Re-seed when the dialog opens with a different event / initialStart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event, template, initialStart, defaultCalendarId, prefill, open]
  );
  const [subject, setSubject] = useState(seed.subject);
  const [description, setDescription] = useState(seed.description);
  const [date, setDate] = useState(seed.date);
  const [startTime, setStartTime] = useState(seed.startTime);
  const [endTime, setEndTime] = useState(seed.endTime);
  const [allDay, setAllDay] = useState(seed.allDay);
  const [location, setLocation] = useState(seed.location);
  const [calendarId, setCalendarId] = useState<string>(seed.calendarId);
  const [timeZone, setTimeZone] = useState<string>(BROWSER_TIME_ZONE);
  const [teamsMeeting, setTeamsMeeting] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>('none');
  const [attendees, setAttendees] = useState(seed.attendees);
  const [color, setColor] = useState<EventColorKey | null>(seed.color);
  const [emails, setEmails] = useState<LinkedEmail[]>(initialEmails ?? []);
  const [records, setRecords] = useState<LinkedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEdit = event !== null;
  const linksQuery = useCalendarEventLinksQuery(
    { accountId, calendarId: event?.calendarId, eventId: event?.id },
    open && isEdit
  );
  const savedLinks = useMemo(() => eventLinksOf(linksQuery.data), [linksQuery.data]);

  // Re-seed during render when the dialog opens, or opens on a different event,
  // start or calendar — keyed on values, so a refetch of the same event while
  // the dialog is open never overwrites what the user typed.
  useResetOnChange(
    JSON.stringify([
      open,
      event?.id ?? null,
      template?.id ?? null,
      initialStart?.getTime() ?? null,
      defaultCalendarId ?? null,
      prefill?.subject ?? null,
    ]),
    () => {
      if (!open) return;
      setSubject(seed.subject);
      setDescription(seed.description);
      setDate(seed.date);
      setStartTime(seed.startTime);
      setEndTime(seed.endTime);
      setAllDay(seed.allDay);
      setLocation(seed.location);
      setCalendarId(seed.calendarId);
      setTimeZone(BROWSER_TIME_ZONE);
      setTeamsMeeting(false);
      setRecurrence('none');
      setAttendees(seed.attendees);
      setColor(seed.color);
      setEmails(isEdit ? savedLinks.emails : (initialEmails ?? []));
      setRecords(isEdit ? savedLinks.records : []);
      setError(null);
    }
  );
  // An edited event's links arrive after it opens: take them once they do.
  useResetOnChange(
    linksQuery.dataUpdatedAt ? `${event?.id}:${linksQuery.dataUpdatedAt}` : '',
    () => {
      if (!open || !isEdit || !linksQuery.data) return;
      setEmails(savedLinks.emails);
      setRecords(savedLinks.records);
    }
  );

  const linksChanged = isEdit && eventLinksChanged(savedLinks, { emails, records });

  const { bring, bringing } = useBringThreadRecords(emails, setRecords);
  const linkEmails = (next: LinkedEmail[]) => {
    setEmails(next);
    void bring(next, emails);
  };
  // An event made from a thread starts with that thread's linked items too —
  // once per open, after the reset above has emptied the list.
  const seedKey =
    open && !isEdit
      ? (initialEmails ?? []).map((email) => `${email.accountId}:${email.providerId}`).join('|')
      : '';
  useEffect(() => {
    if (seedKey) void bring(initialEmails ?? [], []);
    // Keyed by the seed: `initialEmails` is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, bring]);

  const submit = () => {
    const trimmed = subject.trim();
    if (!trimmed) {
      setError('Give the event a title.');
      return;
    }
    // A custom zone reinterprets the entered wall time in that zone; the
    // default keeps the browser's. Both resolve to an absolute instant.
    const usesCustomZone = !allDay && timeZone !== BROWSER_TIME_ZONE;
    // An all-day event keeps the number of days it had, counted in days.
    const allDayDates = allDayRange(parseDate(date), seed.spanDays);
    const start = allDay
      ? allDayDates.start
      : usesCustomZone
        ? zonedWallTimeToUtc(date, startTime, timeZone)
        : combineDateTime(date, startTime);
    const end = allDay
      ? allDayDates.end
      : timedEnd(
          start,
          usesCustomZone
            ? zonedWallTimeToUtc(date, endTime, timeZone)
            : combineDateTime(date, endTime),
          seed.overnight
        );
    if (!allDay && end.getTime() <= start.getTime()) {
      setError('End time must be after start time.');
      return;
    }
    const invalidAttendee = parseEmailAddresses(attendees).find(
      (recipient) => !EMAIL_ADDRESS_PATTERN.test(recipient.address)
    );
    if (invalidAttendee) {
      setError(`Finish or remove “${invalidAttendee.address}” before continuing.`);
      return;
    }
    const attendeesList = parseEmailAddresses(attendees).map((recipient) => ({
      email: recipient.address,
      name: recipient.name,
    }));
    setError(null);

    if (isEdit) {
      // Only send description/attendees the user changed: the pre-filled
      // description can be a truncated preview, and resending attendees would
      // replay invitations on an unrelated edit.
      const descriptionChanged = description.trim() !== seed.description.trim();
      const attendeesChanged = attendees.trim() !== seed.attendees.trim();
      onSubmit(
        {
          mode: 'edit',
          subject: trimmed,
          description: descriptionChanged ? description.trim() : undefined,
          start,
          end,
          isAllDay: allDay,
          location: editedLocation(location, seed.location),
          attendees: attendeesChanged ? attendeesList : undefined,
          detailsChanged: detailsDirty,
          color: color !== seed.color ? color : undefined,
          links: linksChanged ? { emails, records } : undefined,
        },
        event.id
      );
      return;
    }
    onSubmit(
      {
        mode: 'create',
        calendarId,
        subject: trimmed,
        description: description.trim() || undefined,
        start,
        end,
        isAllDay: allDay,
        location: location.trim() || undefined,
        timeZone: allDay ? undefined : timeZone,
        isOnlineMeeting: teamsMeeting || undefined,
        recurrence: recurrence === 'none' ? undefined : recurrence,
        attendees: attendeesList.length ? attendeesList : undefined,
        color: color ?? undefined,
        emailLinks: emails,
        recordLinks: records,
      },
      null
    );
  };

  const activeCalendar = writableCalendars.find(
    (cal) => cal.aurinkoCalendarId === (isEdit ? event.calendarId : calendarId)
  );
  // Color and links are saved by Elli, not the provider: a change to only
  // those skips the provider write.
  const detailsDirty =
    subject !== seed.subject ||
    description !== seed.description ||
    date !== seed.date ||
    startTime !== seed.startTime ||
    endTime !== seed.endTime ||
    allDay !== seed.allDay ||
    location !== seed.location ||
    calendarId !== seed.calendarId ||
    attendees.trim() !== seed.attendees.trim() ||
    (!allDay && timeZone !== BROWSER_TIME_ZONE);
  const isDirty = detailsDirty || color !== seed.color || linksChanged;

  return (
    <RecordModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit event' : 'New event'}
      titleAside={isEdit ? undefined : titleAside}
      description={isEdit ? 'Update this event.' : 'Create a calendar event.'}
      onSubmit={submit}
      autoFocusTitle={!isEdit}
      footer={
        <RecordModalFooter
          submitLabel={isEdit ? 'Save changes' : 'Create event'}
          submitting={submitting}
          canSubmit={subject.trim().length > 0 && !deleting && (!isEdit || isDirty)}
          onCancel={() => onOpenChange(false)}
          error={error}
          leading={
            isEdit && onDelete ? (
              <DeleteEventButton
                event={event}
                deleting={deleting}
                disabled={deleting || submitting}
                onDelete={onDelete}
              />
            ) : null
          }
        />
      }
    >
      <RecordModalCompose
        idPrefix="event"
        title={subject}
        onTitleChange={setSubject}
        titlePlaceholder="Add a title"
        notes={description}
        onNotesChange={setDescription}
        notesPlaceholder="Add notes, an agenda or dial-in details…"
        autoFocus={!isEdit}
      />
      {/* A date taken from an older email can already be over (elli-ui#686). */}
      {!isEdit && startsInPast({ date, startTime, allDay }) ? (
        <p
          role="status"
          className="mx-5 mt-1 flex items-center gap-2 rounded-md bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning-soft-foreground"
        >
          <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
          The event you are creating is in the past.
        </p>
      ) : null}
      <RecordModalProps>
        <PropRow icon={CalendarDays} label="Calendar">
          <div className="flex min-h-9 flex-wrap items-center gap-0.5">
            <CalendarPicker
              calendars={writableCalendars}
              value={calendarId}
              active={activeCalendar}
              editable={!isEdit && writableCalendars.length > 0}
              onChange={setCalendarId}
            />
            <EventColorPicker
              value={color}
              calendarColor={activeCalendar ? calendarColorOf(activeCalendar) : 'primary'}
              onChange={setColor}
              className="bg-transparent hover:bg-accent"
            />
          </div>
        </PropRow>
        <PropRow icon={Clock} label="When">
          <EventWhenField
            date={date}
            startTime={startTime}
            endTime={endTime}
            allDay={allDay}
            timeZone={timeZone}
            zones={TIME_ZONE_OPTIONS}
            onChange={(next) => {
              if (next.date !== undefined) setDate(next.date);
              if (next.startTime !== undefined) setStartTime(next.startTime);
              if (next.endTime !== undefined) setEndTime(next.endTime);
              if (next.allDay !== undefined) setAllDay(next.allDay);
              if (next.timeZone !== undefined) setTimeZone(next.timeZone);
            }}
          />
        </PropRow>
        {!isEdit ? (
          <PropRow icon={Repeat} label="Repeat">
            <RepeatPicker date={date} value={recurrence} onChange={setRecurrence} />
          </PropRow>
        ) : event.isRecurring ? (
          <PropRow icon={Repeat} label="Repeat">
            <p className="flex min-h-9 items-center px-2.5 text-[13px] text-muted-foreground">
              Part of a series — changes apply to this occurrence only.
            </p>
          </PropRow>
        ) : null}
        {!isEdit || event.onlineMeetingUrl ? (
          <PropRow icon={Video} label="Online">
            {isEdit && event.onlineMeetingUrl ? (
              <a
                href={event.onlineMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-medium text-primary transition-colors hover:bg-primary-soft"
              >
                <Video aria-hidden="true" className="size-4" />
                Join Teams meeting
              </a>
            ) : (
              <div className="flex min-h-9 flex-wrap items-center gap-2.5 px-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground/80">
                  <Switch checked={teamsMeeting} onCheckedChange={setTeamsMeeting} />
                  Teams meeting
                </label>
                {teamsMeeting ? (
                  <span className="text-xs text-muted-foreground">
                    Join link is added when the event is created
                  </span>
                ) : null}
              </div>
            )}
          </PropRow>
        ) : null}
        <RecordModalSeparator />
        <PropRow icon={Users} label="Attendees" count={parseEmailAddresses(attendees).length}>
          <EventAttendeesField accountId={accountId} value={attendees} onChange={setAttendees} />
        </PropRow>
        <PropRow icon={MapPin} label="Location" htmlFor="event-location">
          <input
            id="event-location"
            value={location}
            autoComplete="off"
            placeholder="Add a location"
            onChange={(e) => setLocation(e.target.value)}
            className="h-8 w-full rounded-lg bg-transparent px-2.5 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:bg-accent focus:bg-accent"
          />
        </PropRow>
        <RecordModalSeparator />
        <PropRow icon={Mail} label="Emails" count={emails.length}>
          <LinkedEmailsField
            value={emails}
            onChange={linkEmails}
            onNavigate={() => onOpenChange(false)}
          />
        </PropRow>
        <PropRow icon={Link2} label="Linked items" count={records.length}>
          <LinkedRecordsField
            value={records}
            onChange={setRecords}
            useOptions={useRecordLinkOptions}
            bringing={bringing}
          />
        </PropRow>
        {children}
      </RecordModalProps>
    </RecordModal>
  );
}

function CalendarPicker({
  calendars,
  value,
  active,
  editable,
  onChange,
}: {
  calendars: CalendarSelectionRow[];
  value: string;
  active: CalendarSelectionRow | undefined;
  editable: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = (
    <>
      {active ? (
        <span
          aria-hidden="true"
          className={cn('size-2.5 shrink-0 rounded-full', calendarDotClass(active))}
        />
      ) : null}
      {eventCalendarName(active)}
    </>
  );
  if (!editable)
    return <span className="inline-flex h-8 items-center gap-2 px-2.5 text-[13.5px]">{label}</span>;
  return (
    <FieldPopover
      open={open}
      onOpenChange={setOpen}
      label="Calendar"
      className="w-64"
      trigger={
        <FieldButton aria-haspopup="listbox">
          {label}
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground/70" />
        </FieldButton>
      }
    >
      <div role="listbox" aria-label="Calendar">
        {calendars.map((cal) => (
          <PickerOption
            key={cal.aurinkoCalendarId}
            role="option"
            aria-selected={cal.aurinkoCalendarId === value}
            onClick={() => {
              onChange(cal.aurinkoCalendarId);
              setOpen(false);
            }}
          >
            <span
              aria-hidden="true"
              className={cn('size-2.5 shrink-0 rounded-full', calendarDotClass(cal))}
            />
            <span className="min-w-0 flex-1 truncate">{cal.name}</span>
            {cal.aurinkoCalendarId === value ? (
              <Check className="size-4" aria-hidden="true" />
            ) : null}
          </PickerOption>
        ))}
      </div>
    </FieldPopover>
  );
}

function RepeatPicker({
  date,
  value,
  onChange,
}: {
  date: string;
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = recurrenceOptions(date);
  const current = options.find((option) => option.value === value) ?? options[0]!;
  return (
    <FieldPopover
      open={open}
      onOpenChange={setOpen}
      label="Repeat"
      className="w-72"
      trigger={
        <FieldButton aria-haspopup="listbox">
          <span className={cn(value === 'none' && 'text-muted-foreground')}>{current.label}</span>
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground/70" />
        </FieldButton>
      }
    >
      <div role="listbox" aria-label="Repeat">
        {options.map((option) => (
          <PickerOption
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            <span className="min-w-0 flex-1">{option.label}</span>
            {option.value === value ? <Check className="size-4" aria-hidden="true" /> : null}
          </PickerOption>
        ))}
      </div>
    </FieldPopover>
  );
}

function DeleteEventButton({
  event,
  deleting,
  disabled,
  onDelete,
}: {
  event: CalendarEvent;
  deleting: boolean;
  disabled: boolean;
  onDelete: (event: CalendarEvent, target: 'occurrence' | 'series') => void;
}) {
  const className = 'gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive';
  if (event.isRecurring && event.seriesMasterId) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" disabled={disabled} className={className}>
            <Trash2 aria-hidden="true" className="size-4" />
            {deleting ? 'Deleting…' : 'Delete'}
            <ChevronDown aria-hidden="true" className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onDelete(event, 'occurrence')}>
            Delete this event
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(event, 'series')}
          >
            Delete the series
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      className={className}
      onClick={() => onDelete(event, 'occurrence')}
    >
      <Trash2 aria-hidden="true" className="size-4" />
      {deleting ? 'Deleting…' : 'Delete'}
    </Button>
  );
}

// --- helpers --------------------------------------------------------------

function calendarColorOf(row: CalendarSelectionRow): CalendarEventColor {
  return colorForCalendar({ aurinkoCalendarId: row.aurinkoCalendarId, isPrimary: row.isPrimary });
}

function calendarDotClass(row: CalendarSelectionRow): string {
  return CALENDAR_EVENT_STYLES[calendarColorOf(row)].accent;
}

export interface EventPrefill {
  subject: string;
  description: string;
  allDay: boolean;
}

interface DialogSeed {
  /** Days an all-day event covers; the form shows only the first. */
  spanDays: number;
  /** The event being edited or copied ran past midnight. */
  overnight: boolean;
  subject: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  calendarId: string;
  attendees: string;
  color: EventColorKey | null;
}

/** "Ada Lovelace <ada@example.com>" when there's a name, bare address otherwise. */
function attendeeToChipText(attendee: { email: string; name?: string }): string {
  return formatEmailAddress({ address: attendee.email, name: attendee.name });
}

function buildSeed(
  event: CalendarEvent | null,
  template: CalendarEvent | null,
  initialStart: Date | undefined,
  defaultCalendarId: string | undefined,
  writableCalendars: CalendarSelectionRow[],
  prefill: EventPrefill | null = null
): DialogSeed {
  if (event) {
    return {
      spanDays: allDaySpan(event),
      overnight: endsOnLaterDay(event),
      subject: event.title,
      description: event.description ?? '',
      date: format(event.start, 'yyyy-MM-dd'),
      startTime: format(event.start, 'HH:mm'),
      endTime: format(event.end, 'HH:mm'),
      allDay: !!event.allDay,
      location: event.location ?? '',
      calendarId: event.calendarId,
      attendees: event.attendees.map(attendeeToChipText).join(', '),
      color: event.customColor,
    };
  }
  const fallbackCalendar =
    defaultCalendarId ??
    writableCalendars.find((cal) => cal.isPrimary)?.aurinkoCalendarId ??
    writableCalendars[0]?.aurinkoCalendarId ??
    '';
  if (template) {
    // A copy goes back into the calendar it came from when that one is still
    // writable here; otherwise into the default, as a new event would.
    const sameCalendar = writableCalendars.some(
      (cal) => cal.aurinkoCalendarId === template.calendarId
    );
    return {
      spanDays: allDaySpan(template),
      overnight: endsOnLaterDay(template),
      subject: duplicateTitle(template.title),
      description: template.description ?? '',
      date: format(template.start, 'yyyy-MM-dd'),
      startTime: format(template.start, 'HH:mm'),
      endTime: format(template.end, 'HH:mm'),
      allDay: !!template.allDay,
      location: template.location ?? '',
      calendarId: sameCalendar ? template.calendarId : fallbackCalendar,
      attendees: template.attendees.map(attendeeToChipText).join(', '),
      color: template.customColor,
    };
  }
  const base = initialStart ?? new Date();
  // A late-night start (23:30) would put the default one-hour end past
  // midnight — the form only edits one date, so clamp to end of day.
  const defaultEnd = addMinutes(base, 60);
  return {
    spanDays: 1,
    overnight: false,
    date: format(base, 'yyyy-MM-dd'),
    startTime: format(base, 'HH:mm'),
    endTime: isSameDay(defaultEnd, base) ? format(defaultEnd, 'HH:mm') : '23:59',
    allDay: prefill?.allDay ?? false,
    location: '',
    calendarId: fallbackCalendar,
    attendees: '',
    color: null,
    subject: prefill?.subject ?? '',
    description: prefill?.description ?? '',
  };
}

function recurrenceOptions(dateString: string): Array<{ value: RecurrenceValue; label: string }> {
  const parsed = parseDate(dateString);
  const valid = !Number.isNaN(parsed.getTime());
  return [
    { value: 'none', label: 'Does not repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Every weekday' },
    { value: 'weekly', label: valid ? `Weekly on ${format(parsed, 'EEEE')}` : 'Weekly' },
    { value: 'monthly', label: valid ? `Monthly on day ${format(parsed, 'd')}` : 'Monthly' },
    { value: 'yearly', label: valid ? `Yearly on ${format(parsed, 'MMMM d')}` : 'Yearly' },
  ];
}

function zoneOffsetLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

const TIME_ZONE_OPTIONS = (() => {
  try {
    return Intl.supportedValuesOf('timeZone').map((timeZone) => ({
      value: timeZone,
      label: `${timeZone.replace(/_/g, ' ')} (${zoneOffsetLabel(timeZone)})`,
    }));
  } catch {
    return [{ value: 'UTC', label: 'UTC' }];
  }
})();

/** Wall time of a UTC instant in a zone, as UTC-parsed millis for diffing. */
function wallTimeMillis(utcMillis: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(utcMillis))
      .map((part) => [part.type, part.value])
  );
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return Date.parse(
    `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}Z`
  );
}

/**
 * The UTC instant at which the given wall-clock time occurs in `timeZone`.
 * Guess-and-correct via Intl; the second pass settles DST boundary cases.
 */
function zonedWallTimeToUtc(dateString: string, timeString: string, timeZone: string): Date {
  const target = Date.parse(`${dateString}T${timeString}:00Z`);
  let utc = target;
  for (let pass = 0; pass < 2; pass += 1) {
    utc += target - wallTimeMillis(utc, timeZone);
  }
  return new Date(utc);
}

function parseDate(dateString: string): Date {
  return parse(dateString, 'yyyy-MM-dd', new Date());
}

function combineDateTime(dateString: string, timeString: string): Date {
  return parse(`${dateString} ${timeString}`, 'yyyy-MM-dd HH:mm', new Date());
}
