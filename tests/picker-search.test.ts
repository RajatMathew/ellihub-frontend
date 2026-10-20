import { describe, expect, test } from 'bun:test';

import {
  matchesPickerSearch,
  pickerRowsFor,
  pickerSearchState,
  pickerSearchWords,
} from '../src/modules/email/lib/picker-search';

/**
 * "Link email" and "Linked items" in the task and event modals.
 *
 * Typing "audit" showed the newest inbox mail under a "Results" heading for as
 * long as the request took, because the query kept the previous term's rows on
 * screen and the heading followed the debounced term instead of the data.
 */

const recent = [
  { subject: 'Reminder to submit your Bid for WOODHULL HOSPITAL', sender: 'E&A Restoration' },
  { subject: 'Action Required: You have an overdue submittal', sender: 'Gilbane Building' },
  { subject: 'Q3 audit schedule', sender: 'Finance' },
];
const fieldsOf = (row: (typeof recent)[number]) => [row.subject, row.sender];

describe('what the rows on screen are', () => {
  test('the previous term’s rows while the new one is fetched are a search, not results', () => {
    expect(
      pickerSearchState({
        term: 'audit',
        settledTerm: 'audit',
        isPlaceholderData: true,
        isFetching: true,
      })
    ).toBe('searching');
  });

  test('before the debounce catches up it is a search too', () => {
    expect(
      pickerSearchState({
        term: 'audit',
        settledTerm: '',
        isPlaceholderData: false,
        isFetching: false,
      })
    ).toBe('searching');
  });

  test('the answer to what is typed is results', () => {
    expect(
      pickerSearchState({
        term: 'audit ',
        settledTerm: 'audit',
        isPlaceholderData: false,
        isFetching: false,
      })
    ).toBe('results');
  });

  test('an empty box is the recent list', () => {
    expect(
      pickerSearchState({ term: '', settledTerm: '', isPlaceholderData: false, isFetching: false })
    ).toBe('recent');
  });
});

describe('the rows shown', () => {
  test('while searching, only the rows on screen that match what is typed', () => {
    const rows = pickerRowsFor({ rows: recent, state: 'searching', term: 'audit', fieldsOf });
    expect(rows.map((row) => row.subject)).toEqual(['Q3 audit schedule']);
  });

  test('once the answer is in, exactly what the server sent', () => {
    const rows = pickerRowsFor({ rows: recent, state: 'results', term: 'audit', fieldsOf });
    expect(rows).toHaveLength(3);
  });
});

describe('matching', () => {
  test('every word has to appear, in any field and any order', () => {
    expect(matchesPickerSearch(fieldsOf(recent[0]!), 'woodhull bid')).toBe(true);
    expect(matchesPickerSearch(fieldsOf(recent[0]!), 'bid restoration')).toBe(true);
    expect(matchesPickerSearch(fieldsOf(recent[0]!), 'woodhull audit')).toBe(false);
  });

  test('is case-insensitive and ignores blank fields', () => {
    expect(matchesPickerSearch(['PO-1042 · Steel', null, undefined, ''], 'po-1042 STEEL')).toBe(
      true
    );
  });

  test('an empty term matches everything', () => {
    expect(matchesPickerSearch(['anything'], '   ')).toBe(true);
  });

  test('repeated words count once', () => {
    expect(pickerSearchWords('  Bid bid  BID woodhull ')).toEqual(['bid', 'woodhull']);
  });
});
