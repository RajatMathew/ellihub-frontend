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
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
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
import type { CalendarSelectionRow } from '@/modules/email/api';
import {
  CALENDAR_EVENT_STYLES,
  colorForCalendar,
  type CalendarEvent,
} from '@/modules/email/components/calendar/email-calendar-types';
import { addMinutes, differenceInMinutes, format, isSameDay, parse, startOfDay } from 'date-fns';
import { AlignLeft, CalendarDays, Clock, MapPin, Trash2, type LucideIcon } from 'lucide-react';

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
    }
  | {
      mode: 'edit';
      subject: string;
      description?: string;
      start: Date;
      end: Date;
      isAllDay: boolean;
      location?: string;
    };

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. Otherwise it's an edit. */
  event: CalendarEvent | null;
  /** Selection rows (already filtered to writable calendars by the caller). */
  writableCalendars: CalendarSelectionRow[];
  /** Date/time to pre-fill in create mode. */
  initialStart?: Date;
  /** Which calendar to pre-select in create mode. */
  defaultCalendarId?: string;
  onSubmit: (input: CalendarEventDialogSubmit, editingId: string | null) => void;
  onDelete?: (event: CalendarEvent) => void;
  submitting?: boolean;
  deleting?: boolean;
}

export function EmailCalendarEventDialog({
  open,
  onOpenChange,
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
    const start = allDay ? startOfDay(parseDate(date)) : combineDateTime(date, startTime);
    const end = allDay
      ? addMinutes(startOfDay(parseDate(date)), 24 * 60)
      : combineDateTime(date, endTime);
    if (!allDay && end.getTime() <= start.getTime()) {
      setError('End time must be after start time.');
      return;
    }
    const trimmedDescription = description.trim() || undefined;
    const trimmedLocation = location.trim() || undefined;

    if (isEdit) {
      // Only send the description when the user actually changed it. The
      // pre-filled value can be a truncated preview of the stored body —
      // echoing it back on an unrelated edit would overwrite the real text.
      const descriptionChanged = description.trim() !== seed.description.trim();
      onSubmit(
        {
          mode: 'edit',
          subject: trimmed,
          description: descriptionChanged ? description.trim() : undefined,
          start,
          end,
          isAllDay: allDay,
          location: trimmedLocation,
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
    calendarId !== seed.calendarId;

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
            {isEdit && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deleting || submitting}
                className="mr-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(event)}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
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
  };
}

function parseDate(dateString: string): Date {
  return parse(dateString, 'yyyy-MM-dd', new Date());
}

function combineDateTime(dateString: string, timeString: string): Date {
  return parse(`${dateString} ${timeString}`, 'yyyy-MM-dd HH:mm', new Date());
}
