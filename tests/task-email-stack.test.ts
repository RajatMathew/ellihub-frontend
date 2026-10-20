import { describe, expect, test } from 'bun:test';

import {
  EMAIL_STACK_LINKED_ROW_HEIGHT,
  EMAIL_STACK_PEEK,
  EMAIL_STACK_ROW_GAP,
  EMAIL_STACK_ROW_HEIGHT,
  emailStackHeight,
  emailStackRowHeight,
  emailStackRowPlacement,
} from '../src/modules/tasks/lib/task-email-stack';

/**
 * elli-ui#1479 — a task card's emails sit as a pile at rest and fan out into a
 * list when pointed at, as the TaskCard design draws them.
 */

describe('how tall the stack is', () => {
  test('one email is one row, open or not — there is nothing to fan out', () => {
    expect(emailStackHeight(1, false)).toBe(EMAIL_STACK_ROW_HEIGHT);
    expect(emailStackHeight(1, true)).toBe(EMAIL_STACK_ROW_HEIGHT);
  });

  test('a pile at rest shows one sheet behind, however many there are', () => {
    expect(emailStackHeight(2, false)).toBe(EMAIL_STACK_ROW_HEIGHT + EMAIL_STACK_PEEK);
    expect(emailStackHeight(5, false)).toBe(EMAIL_STACK_ROW_HEIGHT + EMAIL_STACK_PEEK);
  });

  test('open, every row and the gaps between them', () => {
    expect(emailStackHeight(5, true)).toBe(5 * EMAIL_STACK_ROW_HEIGHT + 4 * EMAIL_STACK_ROW_GAP);
  });

  test('no emails takes no room', () => {
    expect(emailStackHeight(0, false)).toBe(0);
  });
});

describe('where each row sits', () => {
  test('at rest the front row is untouched and the next peeks out, smaller', () => {
    expect(emailStackRowPlacement(0, false)).toEqual({ transform: 'none', visible: true });
    expect(emailStackRowPlacement(1, false)).toEqual({
      transform: `translateY(${EMAIL_STACK_PEEK}px) scale(0.965)`,
      visible: true,
    });
  });

  test('at rest the third and later rows hide behind the second', () => {
    const third = emailStackRowPlacement(2, false);
    expect(third.visible).toBe(false);
    expect(third.transform).toBe(emailStackRowPlacement(1, false).transform);
  });

  test('open, rows stack top to bottom a row and a gap apart', () => {
    expect(emailStackRowPlacement(2, true)).toEqual({
      transform: `translateY(${2 * (EMAIL_STACK_ROW_HEIGHT + EMAIL_STACK_ROW_GAP)}px)`,
      visible: true,
    });
  });
});

describe('a stack whose emails are linked to a record', () => {
  test('every row makes room for the record line, so the sheets still line up', () => {
    expect(emailStackRowHeight(true)).toBe(EMAIL_STACK_LINKED_ROW_HEIGHT);
    expect(emailStackRowHeight(false)).toBe(EMAIL_STACK_ROW_HEIGHT);
    expect(EMAIL_STACK_LINKED_ROW_HEIGHT).toBeGreaterThan(EMAIL_STACK_ROW_HEIGHT);
  });

  test('the taller rows set the pile and the fanned-out list', () => {
    const row = EMAIL_STACK_LINKED_ROW_HEIGHT;
    expect(emailStackHeight(3, false, row)).toBe(row + EMAIL_STACK_PEEK);
    expect(emailStackHeight(3, true, row)).toBe(3 * row + 2 * EMAIL_STACK_ROW_GAP);
    expect(emailStackRowPlacement(1, true, row).transform).toBe(
      `translateY(${row + EMAIL_STACK_ROW_GAP}px)`
    );
  });
});
