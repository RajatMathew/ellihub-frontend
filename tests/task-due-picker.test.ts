import { describe, expect, test } from 'bun:test';

import {
  dueRelative,
  dueTimes,
  monthCells,
  quickDueDates,
  timeLabel,
} from '../src/modules/tasks/lib/task-due-picker';

/** elli-ui#1379: the task modal's due-date picker. */
const MONDAY = new Date(2026, 9, 12); // Mon 12 Oct 2026
const FRIDAY = new Date(2026, 9, 16);

describe('the quick picks', () => {
  test('are today, tomorrow, this Friday and next Monday', () => {
    expect(quickDueDates(MONDAY).map((pick) => pick.day)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-16',
      '2026-10-19',
    ]);
  });

  test('on a Friday, "Friday" means next week’s', () => {
    expect(quickDueDates(FRIDAY)[2]!.day).toBe('2026-10-23');
  });
});

describe('the month grid', () => {
  test('covers whole weeks, Monday first', () => {
    const cells = monthCells(2026, 9); // October 2026 starts on a Thursday
    expect(cells[0]).toBe('2026-09-28');
    expect(cells).toHaveLength(35);
    expect(cells.at(-1)).toBe('2026-11-01');
  });
});

describe('the times', () => {
  test('run on the half hour, and keep a task’s own odd time', () => {
    const times = dueTimes('17:15');
    expect(times[0]).toBe('08:00');
    expect(times).toContain('17:15');
    expect(times.indexOf('17:15')).toBe(times.indexOf('17:00') + 1);
    expect(timeLabel('17:00')).toBe('5:00 PM');
    expect(timeLabel('00:30')).toBe('12:30 AM');
  });
});

describe('the "in 3 days" beside the date', () => {
  test('says overdue, today, tomorrow or how many days', () => {
    expect(dueRelative('2026-10-11', MONDAY)).toEqual({ text: 'Overdue', tone: 'late' });
    expect(dueRelative('2026-10-12', MONDAY)).toEqual({ text: 'Today', tone: 'soon' });
    expect(dueRelative('2026-10-15', MONDAY)).toEqual({ text: 'in 3 days', tone: 'soon' });
    expect(dueRelative('2026-10-22', MONDAY)).toEqual({ text: 'in 10 days', tone: 'later' });
  });
});
