/**
 * What pressing "next conversation" means when the end of the loaded list is
 * near — or already reached.
 *
 * The list pages on scroll: an `IntersectionObserver` watches a sentinel below
 * the last row and asks for the next page when it comes into view. Keyboard
 * navigation never moved the scroll container far enough to show that sentinel,
 * so arrowing down stopped dead at the last loaded row and no further page was
 * ever requested — the list simply ended, with more mail sitting on the server
 * (elli-ui#1237).
 *
 * Kept here, away from the handler, because it is the part worth testing: the
 * handler itself is a `keydown` listener and a `navigate` call.
 */

/**
 * How close to the end a move has to come before the next page is requested.
 *
 * Not zero. Asking only on the very last row means every reader who gets there
 * waits out a round trip, which is the stall this is meant to remove; asking a
 * few rows early means the page is usually already in hand by the time they
 * arrive. Small enough that someone browsing the first screen never triggers it.
 */
export const KEYBOARD_PAGE_AHEAD_ROWS = 5;

export type KeyboardAdvanceInput = {
  /** Where the open conversation sits in the list as rendered, or -1 for none. */
  selectedIndex: number;
  /** Rows currently loaded. */
  loadedCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** The last page request failed; the list shows a Try again button. */
  loadMoreError: boolean;
};

export type KeyboardAdvanceDecision = {
  /** The row to open, or null when nothing is loaded below the current one. */
  nextIndex: number | null;
  /** Request the next page now. */
  loadMore: boolean;
  /**
   * There was nothing to move to, but more is coming — the caller should open
   * the next row as soon as the page lands, so one keypress means one move
   * rather than one keypress meaning "fetch" and a second meaning "move".
   */
  waitForMore: boolean;
};

const NOTHING: KeyboardAdvanceDecision = {
  nextIndex: null,
  loadMore: false,
  waitForMore: false,
};

export function decideKeyboardAdvance({
  selectedIndex,
  loadedCount,
  hasNextPage,
  isFetchingNextPage,
  loadMoreError,
}: KeyboardAdvanceInput): KeyboardAdvanceDecision {
  // No open conversation, or one that is no longer in the list — there is no
  // "next" to resolve against.
  if (selectedIndex < 0 || selectedIndex >= loadedCount) return NOTHING;

  const rowsBelow = loadedCount - 1 - selectedIndex;
  const hasLoadedNext = rowsBelow > 0;
  // A failed page is not retried from a keypress: the list already offers a
  // Try again button, and retrying on every arrow would hammer a server that
  // has just said no.
  const morePossible = hasNextPage && !loadMoreError;

  return {
    nextIndex: hasLoadedNext ? selectedIndex + 1 : null,
    loadMore: morePossible && !isFetchingNextPage && rowsBelow <= KEYBOARD_PAGE_AHEAD_ROWS,
    // Also true while a page is already in flight — the reader pressed the key,
    // and the move they asked for should still happen when it arrives.
    waitForMore: !hasLoadedNext && morePossible,
  };
}
