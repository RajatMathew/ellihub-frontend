import { describe, expect, test } from 'bun:test';

import { collectActiveFilterChips } from '../src/app/components/data-table/active-filter-chips';
import {
  f,
  isMultiFilter,
  parseMultiValue,
  readFilterValue,
  serializeMultiValue,
  writeFilterValue,
} from '../src/app/components/data-table/filters';
import type { AnyFilterDef } from '../src/app/components/data-table/types';

const noop = () => {};

const VENDOR_FILTER = f.infiniteMultiSelect({
  emptyMessage: 'No vendors found.',
  key: 'vendorId',
  label: 'Vendors',
  onSearchChange: noop,
  options: [
    { label: 'Acme Steel', value: 'aaaaaaaa' },
    { label: 'Borden Glass', value: 'bbbbbbbb' },
    { label: 'Cortez Tile', value: 'cccccccc' },
  ],
  placeholder: 'All Vendors',
  search: '',
  searchPlaceholder: 'Search vendors...',
}) as AnyFilterDef<never>;

const TRADE_FILTER = f.multiSelect({
  key: 'tradeCategoryId',
  options: [{ label: 'Millwork', value: 'mmmmmmmm' }],
  placeholder: 'All Trades',
}) as AnyFilterDef<never>;

const STATUS_FILTER = f.select({
  key: 'status',
  options: [{ label: 'Issued', value: 'ISSUED' }],
  placeholder: 'All Statuses',
}) as AnyFilterDef<never>;

describe('isMultiFilter', () => {
  test('recognises both multi kinds and nothing else', () => {
    expect(isMultiFilter(VENDOR_FILTER)).toBe(true);
    expect(isMultiFilter(TRADE_FILTER)).toBe(true);
    expect(isMultiFilter(STATUS_FILTER)).toBe(false);
  });
});

describe('parseMultiValue', () => {
  test('splits, trims and drops empty entries', () => {
    expect(parseMultiValue(' a , ,b, ')).toEqual(['a', 'b']);
  });

  test('de-duplicates while preserving first-seen order', () => {
    expect(parseMultiValue('b,a,b')).toEqual(['b', 'a']);
  });

  test('treats an absent or empty value as no selection', () => {
    expect(parseMultiValue(undefined)).toEqual([]);
    expect(parseMultiValue('')).toEqual([]);
    expect(parseMultiValue(',,')).toEqual([]);
  });
});

describe('serializeMultiValue', () => {
  test('joins a selection', () => {
    expect(serializeMultiValue(['a', 'b'])).toBe('a,b');
  });

  test('an empty selection drops the param rather than writing a bare key', () => {
    // "No filter", not "match nothing".
    expect(serializeMultiValue([])).toBeUndefined();
    expect(serializeMultiValue([''])).toBeUndefined();
  });
});

describe('readFilterValue', () => {
  test('normalises a hand-typed URL to one canonical form', () => {
    // Otherwise `?vendorId=a,b` and `?vendorId=b,a,b` are the same filter but
    // two React Query cache entries and two API round trips.
    const params = new URLSearchParams('vendorId=aaaaaaaa,,bbbbbbbb,aaaaaaaa');

    expect(readFilterValue(VENDOR_FILTER, params)).toBe('aaaaaaaa,bbbbbbbb');
  });

  test('a value that parses to nothing reads as unset', () => {
    expect(readFilterValue(VENDOR_FILTER, new URLSearchParams('vendorId=,,'))).toBeUndefined();
  });

  test('leaves a single-value filter alone', () => {
    expect(readFilterValue(STATUS_FILTER, new URLSearchParams('status=ISSUED'))).toBe('ISSUED');
  });
});

describe('writeFilterValue', () => {
  test('normalises on the way out too', () => {
    expect(writeFilterValue(VENDOR_FILTER, 'bbbbbbbb,,bbbbbbbb')).toBe('bbbbbbbb');
  });

  test('deselecting the last option drops the param', () => {
    expect(writeFilterValue(VENDOR_FILTER, '')).toBeUndefined();
    expect(writeFilterValue(VENDOR_FILTER, ',')).toBeUndefined();
  });
});

describe('collectActiveFilterChips', () => {
  test('one chip per multi filter, naming the first value and counting the rest', () => {
    const chips = collectActiveFilterChips([VENDOR_FILTER], {
      vendorId: 'aaaaaaaa,bbbbbbbb,cccccccc',
    });

    expect(chips).toEqual([
      { id: 'vendorId', keys: ['vendorId'], label: 'Vendors', value: 'Acme Steel +2' },
    ]);
  });

  test('a single selection reads as just its label', () => {
    const chips = collectActiveFilterChips([VENDOR_FILTER], { vendorId: 'bbbbbbbb' });

    expect(chips[0]?.value).toBe('Borden Glass');
  });

  test('falls back to the raw id while its option is still loading', () => {
    const chips = collectActiveFilterChips([VENDOR_FILTER], { vendorId: 'zzzzzzzz' });

    expect(chips[0]?.value).toBe('zzzzzzzz');
  });

  test('names a selection the loaded page does not contain, from its resolved option', () => {
    // Vendors load A to Z; one chosen by search is not on the first page, but
    // the picker resolves it into `selectedOptions`.
    const withResolved = {
      ...VENDOR_FILTER,
      selectedOptions: [{ label: 'Zenith Roofing', value: 'zzzzzzzz' }],
    } as AnyFilterDef<never>;

    const chips = collectActiveFilterChips([withResolved], { vendorId: 'zzzzzzzz,aaaaaaaa' });

    expect(chips[0]?.value).toBe('Zenith Roofing +1');
  });

  test('the chip clears the whole filter, matching every other chip in the row', () => {
    const chips = collectActiveFilterChips([VENDOR_FILTER], { vendorId: 'aaaaaaaa,bbbbbbbb' });

    expect(chips[0]?.keys).toEqual(['vendorId']);
  });

  test('takes its label from the placeholder when none is declared', () => {
    const chips = collectActiveFilterChips([TRADE_FILTER], { tradeCategoryId: 'mmmmmmmm' });

    expect(chips[0]).toEqual({
      id: 'tradeCategoryId',
      keys: ['tradeCategoryId'],
      label: 'All Trades',
      value: 'Millwork',
    });
  });

  test('an unset multi filter produces no chip', () => {
    expect(collectActiveFilterChips([VENDOR_FILTER], {})).toEqual([]);
  });
});
