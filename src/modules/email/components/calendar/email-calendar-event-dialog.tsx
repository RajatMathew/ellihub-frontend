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
import type { CalendarEvent } from '@/modules/email/components/calendar/email-calendar-types';
import { addMinutes, format, parse, startOfDay } from 'date-fns';
import { Trash2 } from 'lucide-react';

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
      onSubmit(
        {
          mode: 'edit',
          subject: trimmed,
          description: trimmedDescription,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-base">{isEdit ? 'Edit event' : 'New event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogBody className="grid gap-4 px-5 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="calendar-event-title">Title</Label>
              <Input
                id="calendar-event-title"
                autoFocus
                required
                value={subject}
                placeholder="What's on your calendar?"
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {canPickCalendar ? (
              <div className="grid gap-1.5">
                <Label htmlFor="calendar-event-calendar">Calendar</Label>
                <Select value={calendarId} onValueChange={setCalendarId}>
                  <SelectTrigger id="calendar-event-calendar">
                    <SelectValue placeholder="Pick a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {writableCalendars.map((cal) => (
                      <SelectItem key={cal.aurinkoCalendarId} value={cal.aurinkoCalendarId}>
                        {cal.name}
                        {cal.isPrimary ? ' · primary' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : isEdit && activeCalendar ? (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Calendar: <span className="font-medium text-foreground">{activeCalendar.name}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="min-w-0">
                <Label htmlFor="calendar-event-allday" className="text-sm font-medium">
                  All day
                </Label>
                <p className="text-xs text-muted-foreground">Skip the timeline — spans the day.</p>
              </div>
              <Switch id="calendar-event-allday" checked={allDay} onCheckedChange={setAllDay} />
            </div>

            <div className={cn('grid gap-3', allDay ? 'grid-cols-1' : 'grid-cols-3')}>
              <div className="grid gap-1.5">
                <Label htmlFor="calendar-event-date">Date</Label>
                <Input
                  id="calendar-event-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              {!allDay && (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="calendar-event-start">Start</Label>
                    <Input
                      id="calendar-event-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="calendar-event-end">End</Label>
                    <Input
                      id="calendar-event-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="calendar-event-location">Location</Label>
              <Input
                id="calendar-event-location"
                value={location}
                placeholder="Zoom / Room / Address"
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="calendar-event-description">Description</Label>
              <Textarea
                id="calendar-event-description"
                value={description}
                placeholder="Optional notes, agenda, or dial-in details."
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter className="flex items-center gap-2 border-t border-border px-5 py-3">
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
            <Button type="submit" variant="primary" size="sm" disabled={submitting || deleting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- helpers --------------------------------------------------------------

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
      description: '',
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
  return {
    subject: '',
    description: '',
    date: format(base, 'yyyy-MM-dd'),
    startTime: format(base, 'HH:mm'),
    endTime: format(addMinutes(base, 60), 'HH:mm'),
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
