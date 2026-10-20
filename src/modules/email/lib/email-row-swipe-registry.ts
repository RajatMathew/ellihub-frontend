/**
 * Keeps at most one email row's swipe drawer open at a time, the way Mail and
 * Gmail do — opening a second row's actions closes whatever was already open.
 *
 * Module-level rather than state lifted to a parent: rows are deep inside a
 * virtualized list, threaded through several nested renderers already
 * (`virtualized-email-list.tsx`), and every row already knows how to close
 * itself. There is nothing here a parent would do differently, so there is
 * nothing worth plumbing a prop through that whole chain for.
 */
let openRow: { id: string; close: () => void } | null = null;

/** Call when a row's drawer finishes opening. Closes whichever row held it. */
export function openRowSwipe(id: string, close: () => void): void {
  if (openRow && openRow.id !== id) openRow.close();
  openRow = { id, close };
}

/** Call when a row's drawer closes (or the row unmounts) while it held it. */
export function closeRowSwipe(id: string): void {
  if (openRow?.id === id) openRow = null;
}
