import { addDays, differenceInCalendarDays, format, parse, startOfMonth } from 'date-fns';

/**
 * The task modal's due-date picker (elli-ui#1379): the quick picks, the month
 * grid, the times, and the "in 3 days" beside the chosen date. Pure, with the
 * day passed in, so none of it depends on when the tests run.
 */

const DAY = 'yyyy-MM-dd';

export const toDay = (date: Date) => format(date, DAY);
export const fromDay = (day: string) => parse(day, DAY, new Date());

/** Today, Tomorrow, this Friday (next week's on a Friday) and next Monday. */
export function quickDueDates(today: Date): Array<{ label: string; hint: string; day: string }> {
  const ahead = (weekday: number) => addDays(today, (weekday - today.getDay() + 7) % 7 || 7);
  const tomorrow = addDays(today, 1);
  const friday = ahead(5);
  const monday = ahead(1);
  return [
    { label: 'Today', hint: format(today, 'EEE'), day: toDay(today) },
    { label: 'Tomorrow', hint: format(tomorrow, 'EEE'), day: toDay(tomorrow) },
    { label: 'Friday', hint: format(friday, 'd'), day: toDay(friday) },
    { label: 'Next wk', hint: format(monday, 'd'), day: toDay(monday) },
  ];
}

/** Whole weeks covering a month, Monday first, as `yyyy-MM-dd`. */
export function monthCells(year: number, month: number): string[] {
  const first = startOfMonth(new Date(year, month, 1));
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const count = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: count }, (_, index) =>
    toDay(new Date(year, month, 1 - lead + index))
  );
}

/** Half hours from 8 AM to 8 PM, plus the task's own time if it is between them. */
export function dueTimes(current: string | null): string[] {
  const times: string[] = [];
  for (let hour = 8; hour <= 20; hour += 1) {
    for (const minute of ['00', '30']) times.push(`${String(hour).padStart(2, '0')}:${minute}`);
  }
  if (current && !times.includes(current)) times.push(current);
  return times.sort();
}

/** "5:00 PM" from "17:00". */
export function timeLabel(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

/** "Today", "in 3 days", "Overdue" — and how loudly to say it. */
export function dueRelative(
  day: string,
  today: Date
): { text: string; tone: 'late' | 'soon' | 'later' } {
  const diff = differenceInCalendarDays(fromDay(day), today);
  if (diff < 0) return { text: 'Overdue', tone: 'late' };
  if (diff === 0) return { text: 'Today', tone: 'soon' };
  if (diff === 1) return { text: 'Tomorrow', tone: 'soon' };
  return { text: `in ${diff} days`, tone: diff <= 3 ? 'soon' : 'later' };
}

/** The reader's own zone, as the picker's footer names it. */
export function zoneName(now: Date = new Date()): string {
  try {
    return (
      new Intl.DateTimeFormat('en-US', { timeZoneName: 'long' })
        .formatToParts(now)
        .find((part) => part.type === 'timeZoneName')?.value ?? ''
    );
  } catch {
    return '';
  }
}
