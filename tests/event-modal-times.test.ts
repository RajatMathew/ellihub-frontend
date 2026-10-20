import { describe, expect, test } from 'bun:test';

import {
  durationLabel,
  endTimeOptions,
  startTimeOptions,
} from '../src/modules/email/lib/event-modal-times';

/** elli-ui#1379: the event modal's start and end time lists. */
describe('the time lists', () => {
  test('start on every quarter hour of the day', () => {
    const starts = startTimeOptions();
    expect(starts).toHaveLength(96);
    expect(starts[0]).toBe('00:00');
    expect(starts.at(-1)).toBe('23:45');
  });

  test('end after the start, never past midnight, at most twelve hours on', () => {
    expect(endTimeOptions('15:00')[0]).toBe('15:15');
    expect(endTimeOptions('15:00').at(-1)).toBe('23:45');
    expect(endTimeOptions('08:00').at(-1)).toBe('20:00');
    expect(endTimeOptions('23:45')).toEqual(['23:59']);
  });

  test('say how long each end runs', () => {
    expect(durationLabel(45)).toBe('45m');
    expect(durationLabel(60)).toBe('1h');
    expect(durationLabel(90)).toBe('1h 30m');
    expect(durationLabel(0)).toBe('');
  });
});
