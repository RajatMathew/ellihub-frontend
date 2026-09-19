/**
 * Which end of a thread the reader starts at.
 *
 * The pane holds its messages in the order they were sent, because almost
 * everything it derives needs that: which message a reply answers, which one
 * carries the meeting, whether a just-sent reply has come back from the server
 * yet. Only the reading order is inverted, and only here.
 *
 * Newest first (elli-ui#1025). The composer sits above the thread, so with the
 * oldest message first a reply was posted into a list whose far end was off
 * screen — you sent something and nothing you could see changed. Reversed, the
 * message you just sent is the one under the composer, and opening a long
 * thread lands on what is new rather than on where it started.
 */
export function orderThreadNewestFirst<T>(chronological: readonly T[]): T[] {
  return [...chronological].reverse();
}

/**
 * The message a thread's actions belong to — the most recent one, whichever
 * end of the rendered list it is drawn at.
 *
 * Kept as its own function because the pane used to find it by index
 * (`index === messages.length - 1`), which silently meant "the last one drawn"
 * rather than "the newest one" and so pointed at the oldest message the moment
 * the reading order flipped.
 */
export function latestThreadMessage<T>(chronological: readonly T[]): T | null {
  return chronological.length ? (chronological[chronological.length - 1] as T) : null;
}
