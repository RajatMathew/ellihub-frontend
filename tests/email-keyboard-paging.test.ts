import {
  decideKeyboardAdvance,
  KEYBOARD_PAGE_AHEAD_ROWS,
} from '@/modules/email/lib/email-keyboard-paging';
import { describe, expect, test } from 'bun:test';

/**
 * Arrowing down through the mailbox (elli-ui#1237).
 *
 * The list pages on scroll — an IntersectionObserver watches a sentinel below
 * the last row. Keyboard navigation never scrolled far enough to show it, so
 * arrowing down stopped at the last loaded row and no further page was ever
 * asked for. The list just ended, with more mail on the server.
 */

const at = (selectedIndex: number, loadedCount: number, overrides = {}) =>
  decideKeyboardAdvance({
    selectedIndex,
    loadedCount,
    hasNextPage: true,
    isFetchingNextPage: false,
    loadMoreError: false,
    ...overrides,
  });

describe('moving down inside what is loaded', () => {
  test('opens the next row and asks for nothing when the end is far off', () => {
    expect(at(0, 50)).toEqual({ nextIndex: 1, loadMore: false, waitForMore: false });
  });

  test('asks for the next page a few rows early, while still moving', () => {
    // The page is usually in hand by the time the reader arrives, which is the
    // stall this exists to remove.
    const decision = at(50 - 1 - KEYBOARD_PAGE_AHEAD_ROWS, 50);
    expect(decision.nextIndex).toBe(50 - KEYBOARD_PAGE_AHEAD_ROWS);
    expect(decision.loadMore).toBe(true);
    expect(decision.waitForMore).toBe(false);
  });

  test('one row earlier than that, it has not asked yet', () => {
    expect(at(50 - 2 - KEYBOARD_PAGE_AHEAD_ROWS, 50).loadMore).toBe(false);
  });
});

describe('moving down off the end of what is loaded', () => {
  test('asks for the next page and remembers to move when it lands', () => {
    expect(at(49, 50)).toEqual({ nextIndex: null, loadMore: true, waitForMore: true });
  });

  test('does not ask twice while a page is already in flight, but still moves after', () => {
    // The reader pressed the key; the move they asked for should happen when
    // the page arrives, not be swallowed because a fetch was already running.
    expect(at(49, 50, { isFetchingNextPage: true })).toEqual({
      nextIndex: null,
      loadMore: false,
      waitForMore: true,
    });
  });

  test('does nothing at the true end of the mailbox', () => {
    expect(at(49, 50, { hasNextPage: false })).toEqual({
      nextIndex: null,
      loadMore: false,
      waitForMore: false,
    });
  });

  test('does not retry a page that just failed', () => {
    // The list already shows a Try again button; arrowing must not hammer a
    // server that has just said no, and must not hang waiting for a page that
    // is not coming.
    expect(at(49, 50, { loadMoreError: true })).toEqual({
      nextIndex: null,
      loadMore: false,
      waitForMore: false,
    });
  });
});

describe('when there is nothing to move from', () => {
  test('no open conversation', () => {
    expect(at(-1, 50)).toEqual({ nextIndex: null, loadMore: false, waitForMore: false });
  });

  test('an empty list', () => {
    expect(at(-1, 0)).toEqual({ nextIndex: null, loadMore: false, waitForMore: false });
  });

  test('a selection that is no longer in the list', () => {
    // The open conversation can fall out of the list — archived from the
    // reading pane, or filtered away by a change of folder.
    expect(at(80, 50)).toEqual({ nextIndex: null, loadMore: false, waitForMore: false });
  });
});
