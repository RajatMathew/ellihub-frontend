/**
 * When the mail list should ask for its next page.
 *
 * The list used to rely on one IntersectionObserver rooted on its own scroll
 * container, which only speaks when the load-more marker *crosses* into view.
 * On phones that left it stuck at the first page:
 *
 * - a page that lands without pushing the marker back out of view (a short
 *   page, rows the filter hides) never produces another crossing, so nothing
 *   asked for the next one;
 * - where the browser scrolls an outer element instead of the list's own box
 *   (mobile Safari has resolved the list's `h-full` that way), the list box
 *   never scrolls at all, and an observer rooted on it never fires.
 *
 * So the question is asked of geometry instead — is the marker on screen
 * right now — on scroll, on every intersection change, and again each time a
 * page lands. This is that question.
 */
export interface ListPagingState {
  hasNextPage: boolean;
  isLoadingMore: boolean;
  loadMoreError: boolean;
  /** The list is laid out but not shown (the phone's reading view is open). */
  hidden: boolean;
}

export interface VerticalBox {
  top: number;
  bottom: number;
}

/** Whether `marker` overlaps the visible part of every box that clips it. */
export function isMarkerOnScreen(marker: VerticalBox, clips: readonly VerticalBox[]): boolean {
  if (marker.bottom <= marker.top) return false;

  return clips.every((clip) => marker.top < clip.bottom && marker.bottom > clip.top);
}

export function shouldLoadNextPage(state: ListPagingState, markerOnScreen: boolean): boolean {
  if (!markerOnScreen || state.hidden) return false;

  return state.hasNextPage && !state.isLoadingMore && !state.loadMoreError;
}
