import { describe, expect, test } from 'bun:test';

import { getPaginationRange } from '../src/app/lib/pagination-range';

describe('the list pager range', () => {
  test('reads 0 - 0 when there is nothing to show, not 1 - 0', () => {
    expect(getPaginationRange(0, 10, 0)).toEqual({ from: 0, to: 0 });
  });

  test('counts the rows on the page, 1-based', () => {
    expect(getPaginationRange(0, 10, 25)).toEqual({ from: 1, to: 10 });
    expect(getPaginationRange(1, 10, 25)).toEqual({ from: 11, to: 20 });
  });

  test('stops at the last row on a short final page', () => {
    expect(getPaginationRange(2, 10, 25)).toEqual({ from: 21, to: 25 });
  });
});
