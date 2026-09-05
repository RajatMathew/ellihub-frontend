import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import type { CalendarRecurrenceOption, CalendarSelectionRow } from '@/modules/email/api';
import { EmailAddressSuggestionList } from '@/modules/email/components/email-address-suggestions';
import {
  CALENDAR_EVENT_STYLES,
  colorForCalendar,
  type CalendarEvent,
} from '@/modules/email/components/calendar/email-calendar-types';
import { useEmailAddressSuggestions } from '@/modules/email/hooks/use-email-address-suggestions';
import { EMAIL_ADDRESS_PATTERN, parseEmailAddresses } from '@/modules/email/lib/email-addresses';
import { addMinutes, differenceInMinutes, format, isSameDay, parse, startOfDay } from 'date-fns';
import {
  AlignLeft,
  CalendarDays,
  ChevronDown,
  Clock,
  Globe,
  MapPin,
  Repeat,
  Trash2,
  Users,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';

const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

type RecurrenceValue = 'none' | CalendarRecurrenceOption;

// Quiet chip/ghost field styles — fields sit flat until you reach for them,
// so the title and schedule carry the visual weight. Everything is sized to a
// compact 32px rhythm so the rows read as one dense block, not a form.
const CHIP_FIELD =
  'h-8 rounded-md border-transparent bg-muted/60 px-1.5 text-xs font-medium shadow-none transition-colors hover:bg-muted focus-visible:border-border focus-visible:bg-background focus-visible:ring-1';
const GHOST_FIELD =
  'h-8 rounded-md border-transparent bg-transparent px-2 text-sm shadow-none transition-colors hover:bg-muted/50 focus-visible:border-border focus-visible:bg-background focus-visible:ring-1';

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
    };

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Powers attendee contact suggestions — omit to disable them. */
  accountId?: string;
  /** null = create mode. Otherwise it's an edit. */
  event: CalendarEvent | null;
  /** Selection rows (already filtered to writable calendars by the caller). */
  writableCalendars: CalendarSelectionRow[];
  /** Date/time to pre-fill in create mode. */
  initialStart?: Date;
  /** Which calendar to pre-select in create mode. */
  defaultCalendarId?: string;
  onSubmit: (input: CalendarEventDialogSubmit, editingId: string | null) => void;
  /**
   * `target` is 'series' only when the user explicitly chose "Delete the
   * series" on a recurring event — callers should delete `event.id` for
   * 'occurrence' and `event.seriesMasterId` for 'series'.
   */
  onDelete?: (event: CalendarEvent, target: 'occurrence' | 'series') => void;
  submitting?: boolean;
  deleting?: boolean;
}

export function EmailCalendarEventDialog({
  open,
  onOpenChange,
  accountId,
  event,
  writableCalendars,
  initialStart,
  defaultCalendarId,
  onSubmit,
  onDelete,
  submitting = false,
  deleting = false,
}: CalendarEventDialogProps) {
  const seed = useMemo(
    () => buildSeed(event, initialStart, defaultCalendarId, writableCalendars),
    // Re-seed when the dialog opens with a different event / initialStart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event, initialStart, defaultCalendarId, open]
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
  const [showTimeZone, setShowTimeZone] = useState(false);
  const [teamsMeeting, setTeamsMeeting] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>('none');
  const [attendees, setAttendees] = useState(seed.attendees);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    setShowTimeZone(false);
    setTeamsMeeting(false);
    setRecurrence('none');
    setAttendees(seed.attendees);
    setError(null);
  }, [open, seed]);

  const isEdit = event !== null;
  const canPickCalendar = !isEdit && writableCalendars.length > 0;

  const submit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const trimmed = subject.trim();
    if (!trimmed) {
      setError('Give the event a title.');
      return;
    }
    if (!isEdit && !calendarId) {
      setError('Choose which calendar this event lives in.');
      return;
    }
    // A custom zone reinterprets the entered wall time in that zone; the
    // default path keeps the browser-local interpretation.
    const usesCustomZone = !allDay && timeZone !== BROWSER_TIME_ZONE;
    const start = allDay
      ? startOfDay(parseDate(date))
      : usesCustomZone
        ? zonedWallTimeToUtc(date, startTime, timeZone)
        : combineDateTime(date, startTime);
    const end = allDay
      ? addMinutes(startOfDay(parseDate(date)), 24 * 60)
      : usesCustomZone
        ? zonedWallTimeToUtc(date, endTime, timeZone)
        : combineDateTime(date, endTime);
    if (!allDay && end.getTime() <= start.getTime()) {
      setError('End time must be after start time.');
      return;
    }
    const trimmedDescription = description.trim() || undefined;
    const trimmedLocation = location.trim() || undefined;

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

    if (isEdit) {
      // Only send description/attendees when the user actually changed them.
      // The pre-filled description can be a truncated preview of the stored
      // body — echoing it back on an unrelated edit would overwrite the real
      // text. Sending attendees unconditionally on every edit would replay
      // invitation emails to the same people on unrelated changes.
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
          location: trimmedLocation,
          attendees: attendeesChanged ? attendeesList : undefined,
        },
        event.id
      );
    } else {
      onSubmit(
        {
          mode: 'create',
          calendarId,
          subject: trimmed,
          description: trimmedDescription,
          start,
          end,
          isAllDay: allDay,
          location: trimmedLocation,
          timeZone: allDay ? undefined : timeZone,
          isOnlineMeeting: teamsMeeting || undefined,
          recurrence: recurrence === 'none' ? undefined : recurrence,
          attendees: attendeesList.length ? attendeesList : undefined,
        },
        null
      );
    }
  };

  const activeCalendar = writableCalendars.find(
    (cal) => cal.aurinkoCalendarId === (isEdit ? event.calendarId : calendarId)
  );
  const headline = buildHeadline(date, startTime, endTime, allDay);
  // In edit mode, "Save changes" only means something once a field differs
  // from what the event already says.
  const isDirty =
    subject !== seed.subject ||
    description !== seed.description ||
    date !== seed.date ||
    startTime !== seed.startTime ||
    endTime !== seed.endTime ||
    allDay !== seed.allDay ||
    location !== seed.location ||
    calendarId !== seed.calendarId ||
    attendees.trim() !== seed.attendees.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 p-0"
        // Radix focuses the first tabbable element on open, which puts a live
        // caret in the title of an event the user only wants to READ. Keep
        // that for create mode; suppress it for edit.
        onOpenAutoFocus={(e) => {
          if (isEdit) e.preventDefault();
        }}
      >
        <DialogHeader className="gap-0.5 border-b border-border px-6 py-3.5">
          <DialogTitle className="text-lg">{isEdit ? 'Edit event' : 'New event'}</DialogTitle>
          {headline && (
            // Live readback of the schedule — updates as the fields change so
            // the header always says what you're about to put on the calendar.
            <p className="text-xs font-medium tracking-wide text-muted-foreground">{headline}</p>
          )}
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogBody className="flex flex-col gap-1.5 px-6 pb-4 pt-3">
            {/* The title is the one thing every event needs — give it the stage. */}
            <div className="mb-2">
              <Label htmlFor="calendar-event-title" className="sr-only">
                Title
              </Label>
              <Input
                id="calendar-event-title"
                // Only a fresh event wants the caret waiting — an existing
                // title reads as text until the user clicks into it.
                autoFocus={!isEdit}
                required
                value={subject}
                placeholder="Add a title"
                onChange={(e) => setSubject(e.target.value)}
                className={cn(
                  'h-10 rounded-none border-0 border-b bg-transparent px-0 text-lg font-semibold shadow-none placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-0',
                  isEdit
                    ? 'cursor-text border-transparent transition-colors hover:border-border'
                    : 'border-border'
                )}
              />
            </div>

            <FieldRow icon={Clock}>
              <div className="flex flex-nowrap items-center gap-1">
                <Label htmlFor="calendar-event-date" className="sr-only">
                  Date
                </Label>
                <Input
                  id="calendar-event-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(CHIP_FIELD, 'w-fit shrink-0')}
                />
                {!allDay && (
                  <>
                    <Label htmlFor="calendar-event-start" className="sr-only">
                      Start time
                    </Label>
                    <Input
                      id="calendar-event-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={cn(CHIP_FIELD, 'w-fit shrink-0')}
                    />
                    <span aria-hidden="true" className="shrink-0 text-sm text-muted-foreground">
                      –
                    </span>
                    <Label htmlFor="calendar-event-end" className="sr-only">
                      End time
                    </Label>
                    <Input
                      id="calendar-event-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={cn(CHIP_FIELD, 'w-fit shrink-0')}
                    />
                  </>
                )}
                <label
                  htmlFor="calendar-event-allday"
                  className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 pl-1 text-xs font-medium text-muted-foreground"
                >
                  All day
                  <Switch id="calendar-event-allday" checked={allDay} onCheckedChange={setAllDay} />
                </label>
              </div>
              {!isEdit && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Label htmlFor="calendar-event-recurrence" className="sr-only">
                    Repeats
                  </Label>
                  <Select
                    value={recurrence}
                    onValueChange={(value) => setRecurrence(value as RecurrenceValue)}
                  >
                    <SelectTrigger
                      id="calendar-event-recurrence"
                      className={cn(CHIP_FIELD, 'w-fit gap-1.5')}
                    >
                      <Repeat aria-hidden="true" className="size-3.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recurrenceOptions(date).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!allDay && (
                    <button
                      type="button"
                      aria-label="Choose time zone"
                      aria-pressed={showTimeZone}
                      onClick={() => setShowTimeZone((value) => !value)}
                      className={cn(
                        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                        (showTimeZone || timeZone !== BROWSER_TIME_ZONE) &&
                          'bg-muted text-foreground'
                      )}
                    >
                      <Globe aria-hidden="true" className="size-4" />
                    </button>
                  )}
                  {!allDay && showTimeZone && (
                    <SearchableSelect
                      options={TIME_ZONE_OPTIONS}
                      value={timeZone}
                      onValueChange={(value) => value && setTimeZone(value)}
                      placeholder="Time zone"
                      searchPlaceholder="Search time zones…"
                      className="h-8 w-72 text-xs"
                    />
                  )}
                </div>
              )}
              {isEdit && event?.isRecurring && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Repeat aria-hidden="true" className="size-3 shrink-0" />
                  Part of a repeating series — changes apply to this occurrence only.
                </p>
              )}
            </FieldRow>

            {(!isEdit || !!event?.onlineMeetingUrl) && (
              <FieldRow icon={Video}>
                {isEdit && event?.onlineMeetingUrl ? (
                  <a
                    href={event.onlineMeetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 w-fit items-center gap-1.5 rounded-md bg-muted/60 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Video aria-hidden="true" className="size-3.5" />
                    Join Teams meeting
                  </a>
                ) : (
                  <label
                    htmlFor="calendar-event-teams"
                    className="flex h-8 w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Switch
                      id="calendar-event-teams"
                      checked={teamsMeeting}
                      onCheckedChange={setTeamsMeeting}
                    />
                    Teams meeting
                  </label>
                )}
              </FieldRow>
            )}

            <FieldRow icon={Users} align="start">
              <AttendeesField accountId={accountId} value={attendees} onChange={setAttendees} />
            </FieldRow>

            <FieldRow icon={MapPin}>
              <Label htmlFor="calendar-event-location" className="sr-only">
                Location
              </Label>
              <Input
                id="calendar-event-location"
                value={location}
                placeholder="Add a location"
                onChange={(e) => setLocation(e.target.value)}
                className={GHOST_FIELD}
              />
            </FieldRow>

            <FieldRow icon={AlignLeft} align="start">
              <Label htmlFor="calendar-event-description" className="sr-only">
                Description
              </Label>
              <Textarea
                id="calendar-event-description"
                value={description}
                placeholder="Add notes, an agenda, or dial-in details"
                rows={2}
                onChange={(e) => setDescription(e.target.value)}
                // field-sizing-content grows the box with the text (capped,
                // then scrolls) so long agendas never cram into one line.
                className={cn(
                  GHOST_FIELD,
                  'h-auto min-h-14 max-h-48 resize-none py-1.5 leading-5 field-sizing-content'
                )}
              />
            </FieldRow>

            <FieldRow icon={CalendarDays}>
              {canPickCalendar ? (
                <>
                  <Label htmlFor="calendar-event-calendar" className="sr-only">
                    Calendar
                  </Label>
                  <Select value={calendarId} onValueChange={setCalendarId}>
                    <SelectTrigger
                      id="calendar-event-calendar"
                      className={cn(CHIP_FIELD, 'w-fit gap-2')}
                    >
                      <SelectValue placeholder="Pick a calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {writableCalendars.map((cal) => (
                        <SelectItem key={cal.aurinkoCalendarId} value={cal.aurinkoCalendarId}>
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={cn('size-2 shrink-0 rounded-full', calendarDotClass(cal))}
                            />
                            {cal.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <p className="flex h-8 items-center gap-2 px-2 text-sm text-foreground">
                  {activeCalendar && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        calendarDotClass(activeCalendar)
                      )}
                    />
                  )}
                  {activeCalendar?.name ?? 'Calendar'}
                </p>
              )}
            </FieldRow>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter className="flex items-center gap-2 border-t border-border px-6 py-3">
            {isEdit &&
              onDelete &&
              (event.isRecurring && event.seriesMasterId ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deleting || submitting}
                      className="mr-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
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
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={deleting || submitting}
                  className="mr-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(event, 'occurrence')}
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  {deleting ? 'Deleting…' : 'Delete'}
                </Button>
              ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting || deleting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || deleting || (isEdit && !isDirty)}
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- helpers --------------------------------------------------------------

/** Icon-led form row: a muted glyph on a shared left rail, the field beside it. */
function FieldRow({
  icon: Icon,
  align = 'center',
  children,
}: {
  icon: LucideIcon;
  /** "start" for multi-line fields so the glyph pins to the first line. */
  align?: 'center' | 'start';
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[1.75rem_minmax(0,1fr)]',
        align === 'center' ? 'items-center' : 'items-start'
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('size-4 text-muted-foreground/60', align === 'start' && 'mt-2')}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * Chip input for invitee emails, with suggestions from contacts the mailbox
 * has corresponded with (same source the compose "To" field uses). Each
 * address added here — and each one removed on an existing event — gets an
 * invitation or cancellation email sent automatically by the provider once
 * the event is saved; this field itself never sends anything on its own.
 */
function AttendeesField({
  accountId,
  value,
  onChange,
}: {
  accountId?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [buffer, setBuffer] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const chips = useMemo(() => parseEmailAddresses(value), [value]);
  const addresses = useMemo(() => chips.map((chip) => chip.address), [chips]);

  const hasTypedQuery = buffer.trim().length > 0;
  const suggestions = useEmailAddressSuggestions(
    accountId,
    buffer,
    addresses,
    focused && hasTypedQuery
  );
  const suggestionsOpen =
    focused && hasTypedQuery && !suggestionsDismissed && suggestions.length > 0;

  const addAddress = (text: string) => {
    setBuffer('');
    setActiveSuggestionIndex(-1);
    // Compare on the parsed address, not the raw string — a suggestion pick
    // arrives as "Name <email>" and would otherwise duplicate a chip the
    // user already typed as the bare address.
    const address = parseEmailAddresses(text)[0]?.address ?? text;
    if (addresses.includes(address)) return;
    onChange([value, text].filter(Boolean).join(', '));
  };

  const selectSuggestion = (suggestion: { name?: string | null; address: string }) => {
    addAddress(suggestion.name ? `${suggestion.name} <${suggestion.address}>` : suggestion.address);
  };

  const commitBuffer = () => {
    const trimmed = buffer.trim().replace(/[,;]+$/, '').trim();
    if (!trimmed) {
      setBuffer('');
      return;
    }
    addAddress(trimmed);
  };

  const removeChip = (index: number) => {
    onChange(chips.filter((_, i) => i !== index).map((chip) => chip.address).join(', '));
  };

  return (
    <div className="relative min-h-8 py-0.5">
      <Label htmlFor="calendar-event-attendees" className="sr-only">
        Invite attendees
      </Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip, index) => (
          <span
            key={`${chip.address}-${index}`}
            className="flex h-7 items-center gap-1 rounded-md bg-muted/60 pl-2 pr-1 text-xs font-medium text-foreground"
          >
            {chip.name || chip.address}
            <button
              type="button"
              aria-label={`Remove ${chip.address}`}
              onClick={() => removeChip(index)}
              className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        ))}
        <Input
          id="calendar-event-attendees"
          type="text"
          role="combobox"
          aria-expanded={suggestionsOpen}
          aria-controls="calendar-event-attendee-suggestions"
          autoComplete="off"
          value={buffer}
          placeholder={chips.length ? 'Add another attendee' : 'Invite attendees'}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const raw = e.target.value;
            setSuggestionsDismissed(false);
            setActiveSuggestionIndex(-1);
            if (/[,;]/.test(raw)) {
              const parts = raw.split(/[,;]/).map((part) => part.trim());
              const nextBuffer = parts.pop() ?? '';
              const seen = new Set(addresses);
              const additions = parts.filter((part) => part && !seen.has(part));
              if (additions.length) {
                onChange([...addresses, ...additions].join(', '));
              }
              setBuffer(nextBuffer);
              return;
            }
            setBuffer(raw);
          }}
          onKeyDown={(e) => {
            if (suggestionsOpen && e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveSuggestionIndex((index) => Math.min(index + 1, suggestions.length - 1));
              return;
            }
            if (suggestionsOpen && e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
              return;
            }
            if (suggestionsOpen && e.key === 'Escape') {
              e.preventDefault();
              setSuggestionsDismissed(true);
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (suggestionsOpen && activeSuggestionIndex >= 0) {
                selectSuggestion(suggestions[activeSuggestionIndex]);
                return;
              }
              commitBuffer();
            } else if (e.key === 'Backspace' && !buffer && chips.length > 0) {
              removeChip(chips.length - 1);
            }
          }}
          onBlur={() => {
            setFocused(false);
            commitBuffer();
          }}
          className={cn(GHOST_FIELD, 'h-7 w-40 flex-1 px-1.5')}
        />
      </div>
      {suggestionsOpen && (
        <div id="calendar-event-attendee-suggestions">
          <EmailAddressSuggestionList
            accountId={accountId}
            suggestions={suggestions}
            activeIndex={activeSuggestionIndex}
            onSelect={(address) => {
              const suggestion = suggestions.find((item) => item.address === address);
              if (suggestion) selectSuggestion(suggestion);
              else addAddress(address);
            }}
          />
        </div>
      )}
    </div>
  );
}

function calendarDotClass(row: CalendarSelectionRow): string {
  return CALENDAR_EVENT_STYLES[
    colorForCalendar({ aurinkoCalendarId: row.aurinkoCalendarId, isPrimary: row.isPrimary })
  ].accent;
}

/**
 * Header readback: "Tuesday, August 25 · 9:30 am – 10:30 am · 1h". Falls back
 * gracefully while a field is mid-edit (cleared date, unparsable time).
 */
function buildHeadline(
  date: string,
  startTime: string,
  endTime: string,
  allDay: boolean
): string | null {
  const parsedDate = parseDate(date);
  if (Number.isNaN(parsedDate.getTime())) return null;
  const day = format(parsedDate, 'EEEE, MMMM d');
  if (allDay) return `${day} · all day`;
  const start = parse(startTime, 'HH:mm', parsedDate);
  const end = parse(endTime, 'HH:mm', parsedDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return day;
  const span = `${format(start, 'h:mm a').toLowerCase()} – ${format(end, 'h:mm a').toLowerCase()}`;
  const minutes = differenceInMinutes(end, start);
  if (minutes <= 0) return `${day} · ${span}`;
  const duration =
    minutes >= 60
      ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
      : `${minutes}m`;
  return `${day} · ${span} · ${duration}`;
}

interface DialogSeed {
  subject: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  calendarId: string;
  attendees: string;
}

/** "Ada Lovelace <ada@example.com>" when there's a name, bare address otherwise. */
function attendeeToChipText(attendee: { email: string; name?: string }): string {
  return attendee.name ? `${attendee.name} <${attendee.email}>` : attendee.email;
}

function buildSeed(
  event: CalendarEvent | null,
  initialStart: Date | undefined,
  defaultCalendarId: string | undefined,
  writableCalendars: CalendarSelectionRow[]
): DialogSeed {
  if (event) {
    return {
      subject: event.title,
      description: event.description ?? '',
      date: format(event.start, 'yyyy-MM-dd'),
      startTime: format(event.start, 'HH:mm'),
      endTime: format(event.end, 'HH:mm'),
      allDay: !!event.allDay,
      location: event.location ?? '',
      calendarId: event.calendarId,
      attendees: event.attendees.map(attendeeToChipText).join(', '),
    };
  }
  const base = initialStart ?? new Date();
  const fallbackCalendar =
    defaultCalendarId ??
    writableCalendars.find((cal) => cal.isPrimary)?.aurinkoCalendarId ??
    writableCalendars[0]?.aurinkoCalendarId ??
    '';
  // A late-night start (23:30) would put the default one-hour end past
  // midnight — the form only edits one date, so clamp to end of day.
  const defaultEnd = addMinutes(base, 60);
  return {
    subject: '',
    description: '',
    date: format(base, 'yyyy-MM-dd'),
    startTime: format(base, 'HH:mm'),
    endTime: isSameDay(defaultEnd, base) ? format(defaultEnd, 'HH:mm') : '23:59',
    allDay: false,
    location: '',
    calendarId: fallbackCalendar,
    attendees: '',
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
