import { describe, expect, test } from 'bun:test';

import {
  calendarProjectOptions,
  eventsInProjects,
} from '../src/modules/email/lib/calendar-project-filter';

/** elli-ui#1381: filter the Calendar tab by project, as the task board does. */
const ps082 = { id: 'p1', name: '30000 - PS 082K' };
const ps105 = { id: 'p2', name: 'PS 105X' };
const event = (id: string, projects: Array<{ id: string; name: string }>) => ({ id, projects });

describe('the calendar project filter', () => {
  const events = [event('a', [ps082]), event('b', [ps105, ps082]), event('c', [])];

  test('offers each project an event on screen belongs to, once, in name order', () => {
    expect(calendarProjectOptions(events)).toEqual([ps082, ps105]);
  });

  test('keeps a chosen project offered on a week with none of its events', () => {
    expect(calendarProjectOptions([event('c', [])], [ps105])).toEqual([ps105]);
  });

  test('shows only the events in a chosen project, and every event with none chosen', () => {
    expect(eventsInProjects(events, ['p2']).map((item) => item.id)).toEqual(['b']);
    expect(eventsInProjects(events, ['p1']).map((item) => item.id)).toEqual(['a', 'b']);
    expect(eventsInProjects(events, []).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});
