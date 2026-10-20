import { describe, expect, test } from 'bun:test';

import {
  calendarSearchWindow,
  descriptionText,
  eventMatchesSearch,
  rankSearchResults,
} from '../src/modules/email/lib/calendar-search';
import { boardWantsTask } from '../src/modules/tasks/lib/task-cache';
import { searchBoard, searchWords, taskMatchesSearch } from '../src/modules/tasks/lib/task-search';
import type { TaskBoard } from '../src/modules/tasks/schemas/task.schema';

/** elli-ui#1380: searching the Tasks and Calendar tabs. */

const task = (id: string, title: string, description: string | null = null) =>
  ({
    id,
    title,
    description,
    assigneeId: 'u1',
  }) as unknown as TaskBoard['columns']['OVERDUE']['tasks'][number];

describe('a task search', () => {
  test('needs every word, in any order, in the title or description', () => {
    const words = searchWords('  Halden   QUOTE ');
    expect(words).toEqual(['halden', 'quote']);
    expect(
      taskMatchesSearch({ title: 'Confirm revised quote', description: 'Halden Steel' }, words)
    ).toBe(true);
    expect(taskMatchesSearch({ title: 'Confirm revised quote', description: null }, words)).toBe(
      false
    );
  });

  test('a blank search matches everything', () => {
    expect(taskMatchesSearch({ title: 'x', description: null }, searchWords('  '))).toBe(true);
  });

  test('stops at eight words, like the server', () => {
    expect(searchWords('a b c d e f g h i j')).toHaveLength(8);
  });
});

describe('the board while a search is typed', () => {
  const board = {
    columns: {
      OVERDUE: { tasks: [task('1', 'Halden quote'), task('2', 'Site walk')], total: 240 },
      DUE_TODAY: { tasks: [], total: 0 },
      TOMORROW: { tasks: [task('3', 'Call Halden')], total: 1 },
      PENDING: { tasks: [], total: 0 },
      COMPLETED: { tasks: [], total: 0 },
    },
    people: [],
    projects: [],
  } as unknown as TaskBoard;

  test('filters the cards on screen at once, counting what is shown', () => {
    const narrowed = searchBoard(board, 'halden', false);
    expect(narrowed.columns.OVERDUE.tasks.map((t) => t.id)).toEqual(['1']);
    expect(narrowed.columns.OVERDUE.total).toBe(1);
    expect(narrowed.columns.TOMORROW.tasks.map((t) => t.id)).toEqual(['3']);
  });

  test('keeps the server’s totals once it answered this very search', () => {
    expect(searchBoard(board, 'halden', true).columns.OVERDUE.total).toBe(240);
  });

  test('an empty search leaves the board untouched', () => {
    expect(searchBoard(board, '', false)).toBe(board);
  });
});

describe('a searched board in the cache', () => {
  test('drops a task edited so the search no longer finds it', () => {
    const params = { search: 'halden' };
    expect(
      boardWantsTask(params, { assigneeId: 'u1', title: 'Halden quote', description: null })
    ).toBe(true);
    expect(
      boardWantsTask(params, { assigneeId: 'u1', title: 'Site walk', description: null })
    ).toBe(false);
  });

  test('a board without a search still takes every task', () => {
    expect(
      boardWantsTask(undefined, { assigneeId: null, title: 'Anything', description: null })
    ).toBe(true);
  });
});

describe('a calendar search', () => {
  const now = new Date('2026-10-12T12:00:00');
  const event = (title: string, start: string, extra: Record<string, unknown> = {}) => ({
    title,
    start: new Date(start),
    end: new Date(new Date(start).getTime() + 3_600_000),
    attendees: [],
    projects: [],
    ...extra,
  });

  test('finds an event by its location, attendee, project or description too', () => {
    const walk = event('Site walk', '2026-10-14T09:00:00', {
      location: 'East elevation',
      attendees: [{ email: 'raj@halden.com', name: 'Raj Patel' }],
      projects: [{ id: 'p1', name: 'PS 082K' }],
      description: '<p>Bring the <strong>drawings</strong></p>',
    });
    for (const term of ['elevation', 'raj', 'halden.com', '082k', 'drawings']) {
      expect(eventMatchesSearch(walk, searchWords(term))).toBe(true);
    }
    // Tag names are not words.
    expect(eventMatchesSearch(walk, searchWords('strong'))).toBe(false);
  });

  test('the mailbox’s own address matches nothing, or every event would', () => {
    const meeting = event('Standup', '2026-10-14T09:00:00', {
      organizer: 'Aaryan <aaryan@ellicorp.com>',
      attendees: [
        { email: 'aaryan@ellicorp.com', name: 'Aaryan' },
        { email: 'raj@halden.com', name: 'Raj' },
      ],
    });
    expect(eventMatchesSearch(meeting, searchWords('aaryan'), 'Aaryan@ellicorp.com')).toBe(false);
    expect(eventMatchesSearch(meeting, searchWords('raj'), 'aaryan@ellicorp.com')).toBe(true);
    expect(eventMatchesSearch(meeting, searchWords('aaryan'))).toBe(true);
    // Shown by name, known by address: still the mailbox's own.
    const own = event('Review', '2026-10-14T09:00:00', {
      organizer: 'Test In',
      organizerEmail: 'testt121121@outlook.com',
    });
    expect(eventMatchesSearch(own, searchWords('test'), 'testt121121@outlook.com')).toBe(false);
  });

  test('lists what is to come first, soonest first, then the past, latest first', () => {
    const ranked = rankSearchResults(
      [
        event('Walk A', '2026-10-01T09:00:00'),
        event('Walk B', '2026-11-20T09:00:00'),
        event('Walk C', '2026-10-13T09:00:00'),
        event('Walk D', '2026-10-10T09:00:00'),
        event('Lunch', '2026-10-13T12:00:00'),
      ],
      searchWords('walk'),
      now
    );
    expect(ranked.map((e) => e.title)).toEqual(['Walk C', 'Walk B', 'Walk D', 'Walk A']);
  });

  // elli-ui#1490: "shop" listed four deliveries whose notes mention the shop
  // before the event called "Shop / Warehouse Cleaning".
  test('an event titled by the search comes before ones that only mention it', () => {
    const note = { description: '<p>Load out from the shop, 2nd floor</p>' };
    const ranked = rankSearchResults(
      [
        event('BPL PA12- Pick up', '2026-10-16T15:30:00', note),
        event('Creedmoor 9B Desk- ASST Delivery', '2026-10-16T17:30:00', note),
        event('VITSOE-BPL 30300 (PA12) TENTATIVE', '2026-10-16T22:00:00', {
          attendees: [{ email: 'shop@vitsoe.com', name: 'Vitsoe' }],
        }),
        event('Shop / Warehouse Cleaning', '2026-10-17T00:30:00'),
        event('Workshop review', '2026-10-13T13:00:00'),
        event('Ellis shop visit', '2026-10-20T09:00:00'),
        event('Delivery', '2026-10-21T09:00:00', { location: 'Shop yard' }),
      ],
      searchWords('shop'),
      now
    );
    expect(ranked.map((e) => e.title)).toEqual([
      'Shop / Warehouse Cleaning',
      'Ellis shop visit',
      'Workshop review',
      'Delivery',
      'VITSOE-BPL 30300 (PA12) TENTATIVE',
      'BPL PA12- Pick up',
      'Creedmoor 9B Desk- ASST Delivery',
    ]);
  });

  test('a phrase the title starts with outranks the same words further in', () => {
    const ranked = rankSearchResults(
      [
        event('Cleaning of the warehouse', '2026-10-14T09:00:00'),
        event('Warehouse cleaning', '2026-10-20T09:00:00'),
      ],
      searchWords('warehouse clean'),
      now
    );
    expect(ranked.map((e) => e.title)).toEqual(['Warehouse cleaning', 'Cleaning of the warehouse']);
  });

  test('a weekly meeting takes one row, its next occurrence', () => {
    const weekly = (start: string) => event('PM Meeting - SCA', start, { seriesMasterId: 's1' });
    const ranked = rankSearchResults(
      [
        weekly('2026-10-05T11:00:00'),
        weekly('2026-10-19T11:00:00'),
        weekly('2026-10-26T11:00:00'),
        event('PM review', '2026-11-02T09:00:00'),
      ],
      searchWords('pm'),
      now
    );
    expect(ranked.map((e) => [e.title, e.start.getDate()])).toEqual([
      ['PM Meeting - SCA', 19],
      ['PM review', 2],
    ]);
  });

  test('the CSS in an Outlook description is not searched', () => {
    const outlook =
      '<html><head><style><!-- p.MsoNormal { font-family: Calibri; color: black } --></style></head>' +
      '<body><!--[if mso]><style>.x { font-size: 9pt }</style><![endif]--><p>Bring&nbsp;the keys &amp; badge</p></body></html>';
    const walk = event('Site walk', '2026-10-14T09:00:00', { description: outlook });
    expect(descriptionText(outlook).trim()).toBe('Bring the keys & badge');
    for (const term of ['font', 'calibri', 'color', 'mso', 'nbsp']) {
      expect(eventMatchesSearch(walk, searchWords(term))).toBe(false);
    }
    expect(eventMatchesSearch(walk, searchWords('keys & badge'))).toBe(true);
  });

  test('accents do not stop a match', () => {
    expect(
      eventMatchesSearch(event('Café meeting', '2026-10-14T09:00:00'), searchWords('cafe'))
    ).toBe(true);
  });

  test('the wider window is the same all day, so it is fetched once', () => {
    expect(calendarSearchWindow(new Date('2026-10-12T08:00:00'))).toEqual(
      calendarSearchWindow(new Date('2026-10-12T23:00:00'))
    );
  });
});
