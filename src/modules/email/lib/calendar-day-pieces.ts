import { addDays, startOfDay } from 'date-fns';

/**
 * The part of a timed event that falls on one day (elli-ui#1260).
 *
 * The week and day timelines draw one column per day, and they used to place a
 * timed event only on the day it started — `isSameDay(event.start, day)` — and
 * clamp it at midnight. A shift from 10 pm to 6 am showed two hours on Monday
 * and nothing at all on Tuesday morning, when the crew is actually on site.
 *
 * A piece keeps the whole event alongside its slice of the day, so editing,
 * deleting or marking it done still acts on the event, and the card can still
 * print its real start and end.
 */
export interface DayPiece<E extends TimedSpan> {
  event: E;
  start: Date;
  end: Date;
  allDay: false;
}

interface TimedSpan {
  start: Date;
  end: Date;
  allDay?: boolean;
}

/** Whether `event` covers any part of `day`. An event ending at midnight does not reach the next day. */
export function overlapsDay(event: TimedSpan, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  return event.start < dayEnd && event.end > dayStart;
}

/** Every timed event that touches `day`, cut to the part of it that falls on that day. */
export function timedPiecesForDay<E extends TimedSpan>(
  events: readonly E[],
  day: Date
): Array<DayPiece<E>> {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const pieces: Array<DayPiece<E>> = [];

  for (const event of events) {
    if (event.allDay) continue;

    // A zero-length event (start == end) still belongs on the day it starts.
    const touches =
      event.end > event.start
        ? overlapsDay(event, day)
        : event.start >= dayStart && event.start < dayEnd;
    if (!touches) continue;

    pieces.push({
      event,
      start: event.start > dayStart ? event.start : dayStart,
      end: event.end < dayEnd ? event.end : dayEnd,
      allDay: false,
    });
  }

  return pieces;
}
