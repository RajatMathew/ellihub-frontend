import { describe, expect, test } from 'bun:test';

import { highlightParts } from '../src/app/lib/search-highlight';
import { boardWantsTask } from '../src/modules/tasks/lib/task-cache';
import {
  referencesForSearch,
  searchBoard,
  searchWords,
  taskMatchesSearch,
} from '../src/modules/tasks/lib/task-search';
import type { TaskBoard } from '../src/modules/tasks/schemas/task.schema';

/** elli-ui#1422: marking the search on task cards, and finding tasks by their email's subject. */

const marked = (text: string, search: string) =>
  highlightParts(text, searchWords(search))
    .filter((part) => part.match)
    .map((part) => part.text);

describe('highlighting a search inside text', () => {
  test('marks every word, wherever it falls and whatever its case', () => {
    expect(marked('Confirm revised Halden quote with halden', 'HALDEN quote')).toEqual([
      'Halden',
      'quote',
      'halden',
    ]);
  });

  test('the parts always join back into the original text', () => {
    const text = 'Call Halden about the Q3 quote';
    const parts = highlightParts(text, searchWords('halden q'));
    expect(parts.map((part) => part.text).join('')).toBe(text);
  });

  test('merges overlapping words into one mark', () => {
    expect(marked('abcdef', 'abc cde')).toEqual(['abcde']);
  });

  test('takes regex characters literally', () => {
    expect(marked('Invoice (draft) 50%+ off', '(draft) 50%+')).toEqual(['(draft)', '50%+']);
    expect(marked('anything', '.*')).toEqual([]);
  });

  test('marks nothing when nothing matches or nothing is searched', () => {
    expect(highlightParts('Site walk', searchWords('halden'))).toEqual([
      { text: 'Site walk', match: false },
    ]);
    expect(highlightParts('Site walk', [])).toEqual([{ text: 'Site walk', match: false }]);
  });
});

describe('a task found by the subject of its email', () => {
  const raised = {
    title: 'Chase the revision',
    description: null,
    emailReferences: [{ subject: 'RE: Halden Steel invoice 4471' }],
  };

  test('matches when the word is only in a linked email subject', () => {
    expect(taskMatchesSearch(raised, searchWords('invoice 4471'))).toBe(true);
  });

  test('each word may match in a different place, as on the server', () => {
    expect(taskMatchesSearch(raised, searchWords('revision halden'))).toBe(true);
    expect(taskMatchesSearch(raised, searchWords('revision walk'))).toBe(false);
  });

  test('a task without references, or with a blank subject, still searches its own text', () => {
    expect(taskMatchesSearch({ title: 'Halden', description: null }, ['halden'])).toBe(true);
    expect(
      taskMatchesSearch(
        { title: 'Site walk', description: null, emailReferences: [{ subject: null }] },
        ['halden']
      )
    ).toBe(false);
  });

  test('the instant board filter keeps it', () => {
    const board = {
      columns: {
        OVERDUE: { tasks: [{ id: '1', ...raised }], total: 1 },
        DUE_TODAY: { tasks: [], total: 0 },
        TOMORROW: { tasks: [], total: 0 },
        PENDING: { tasks: [], total: 0 },
        COMPLETED: { tasks: [], total: 0 },
      },
      people: [],
      projects: [],
    } as unknown as TaskBoard;
    expect(searchBoard(board, 'invoice', false).columns.OVERDUE.tasks).toHaveLength(1);
  });

  test('a cached searched board keeps it', () => {
    expect(boardWantsTask({ search: 'invoice' }, { ...raised, assigneeId: null })).toBe(true);
  });
});

describe('ordering a card’s emails for a search', () => {
  const refs = [{ subject: 'Site walk notes' }, { subject: 'Halden invoice' }, { subject: null }];

  test('puts the email whose subject matched first, so the card shows it', () => {
    expect(referencesForSearch(refs, ['invoice']).map((ref) => ref.subject)).toEqual([
      'Halden invoice',
      'Site walk notes',
      null,
    ]);
  });

  test('leaves the order alone when nothing is searched, nothing matched, or it is already first', () => {
    expect(referencesForSearch(refs, [])).toBe(refs);
    expect(referencesForSearch(refs, ['quote'])).toBe(refs);
    expect(referencesForSearch(refs, ['site'])).toBe(refs);
  });
});
