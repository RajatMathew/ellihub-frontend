import { describe, expect, test } from 'bun:test';

import {
  groupHistory,
  historyTimeLabel,
  matchesHistorySearch,
  plainSummary,
} from '../src/mock/agent-history';

// The suite runs on a New York clock (tests/setup-time-zone.ts).
const NOW = new Date('2026-10-10T15:00:00-04:00');
const at = (iso: string) => ({ id: iso, title: iso, summary: null, updatedAt: iso });

describe('Elliot chat history summaries', () => {
  test('strips the markdown the list used to print raw', () => {
    // Both previews from the real list.
    expect(plainSummary('The email was received on **October 10, 2026** (2026-10-10).')).toBe(
      'The email was received on October 10, 2026 (2026-10-10).'
    );
    expect(plainSummary("Here's a suggested reply:\n\n> Thanks for the options. Tomorrow")).toBe(
      "Here's a suggested reply: Thanks for the options. Tomorrow"
    );
  });

  test('drops a quote marker the server joined onto the same line', () => {
    // The stored summary is one line, so the quote is not at a line start.
    expect(plainSummary("Here's a suggested reply: > Thanks for the options.")).toBe(
      "Here's a suggested reply: Thanks for the options."
    );
    expect(plainSummary('Only if 5 > 3')).toBe('Only if 5 > 3');
  });

  test('handles headings, lists, code, links and tables', () => {
    expect(plainSummary('## Breakdown\n- one\n- two\n1. three')).toBe('Breakdown one two three');
    expect(plainSummary('Use `RFQ-104` and *this* or _that_')).toBe('Use RFQ-104 and this or that');
    expect(plainSummary('See [the RFQ](https://x.test/rfq) now')).toBe('See the RFQ now');
    expect(plainSummary('| Project | Job |\n|---|---|\n| Testing | 2026-001 |')).toBe(
      'Project Job Testing 2026-001'
    );
    expect(plainSummary('Before\n```\ncode\n```\nafter')).toBe('Before after');
  });

  test('keeps underscores and asterisks that are not emphasis', () => {
    expect(plainSummary('file_name_v2.pdf costs 5 * 3')).toBe('file_name_v2.pdf costs 5 3');
  });

  test('an empty summary is empty, not "null"', () => {
    expect(plainSummary(null)).toBe('');
    expect(plainSummary('   ')).toBe('');
  });
});

describe('Elliot chat history grouping', () => {
  test('groups by the viewer’s day, newest first', () => {
    const groups = groupHistory(
      [
        at('2026-10-02T09:00:00-04:00'),
        at('2026-10-10T08:00:00-04:00'),
        at('2026-10-09T23:30:00-04:00'),
        at('2026-10-10T14:00:00-04:00'),
        at('2026-10-06T12:00:00-04:00'),
      ],
      NOW
    );
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['Today', ['2026-10-10T14:00:00-04:00', '2026-10-10T08:00:00-04:00']],
      ['Yesterday', ['2026-10-09T23:30:00-04:00']],
      ['Previous 7 days', ['2026-10-06T12:00:00-04:00']],
      ['Older', ['2026-10-02T09:00:00-04:00']],
    ]);
  });

  test('late evening in New York is still today, though it is tomorrow in UTC', () => {
    const lateNight = new Date('2026-10-10T23:30:00-04:00');
    const [group] = groupHistory([at('2026-10-10T22:00:00-04:00')], lateNight);
    expect(group.label).toBe('Today');
  });

  test('leaves out empty groups', () => {
    expect(groupHistory([], NOW)).toEqual([]);
    expect(groupHistory([at('2026-10-10T10:00:00-04:00')], NOW).map((g) => g.label)).toEqual([
      'Today',
    ]);
  });
});

describe('Elliot chat history time labels', () => {
  test('reads like a chat list', () => {
    expect(historyTimeLabel('2026-10-10T14:59:40-04:00', NOW)).toBe('Just now');
    expect(historyTimeLabel('2026-10-10T14:48:00-04:00', NOW)).toBe('12m');
    expect(historyTimeLabel('2026-10-10T11:30:00-04:00', NOW)).toBe('3h');
    expect(historyTimeLabel('2026-10-09T20:00:00-04:00', NOW)).toBe('Yesterday');
    expect(historyTimeLabel('2026-10-06T12:00:00-04:00', NOW)).toBe('Tue');
    expect(historyTimeLabel('2026-10-03T12:00:00-04:00', NOW)).toBe('Oct 3');
    expect(historyTimeLabel('2025-12-31T12:00:00-05:00', NOW)).toBe('Dec 31, 2025');
  });

  test('an unreadable date shows nothing rather than "Invalid Date"', () => {
    expect(historyTimeLabel('not a date', NOW)).toBe('');
  });
});

describe('Elliot chat history search', () => {
  test('matches the plain text, ignoring case and markdown', () => {
    const item = {
      id: '1',
      title: 'Date suggestions test',
      summary: 'On **October 10**',
      updatedAt: '',
    };
    expect(matchesHistorySearch(item, 'october 10')).toBe(true);
    expect(matchesHistorySearch(item, 'DATE sugg')).toBe(true);
    expect(matchesHistorySearch(item, '**')).toBe(false);
    expect(matchesHistorySearch(item, '  ')).toBe(true);
  });
});
