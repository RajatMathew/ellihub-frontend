/**
 * How far a short card is stretched to match the tallest one, in pixels.
 *
 * About a two-line title with one line of body. Past that the tallest card
 * keeps its own height and the rest stop following it: a three-line title
 * with a two-line body should not turn every one-word task on the board into
 * a tall box of nothing.
 */
export const TASK_CARD_HEIGHT_CAP = 120;

/**
 * The minimum height every card takes, given each card's natural height.
 *
 * The tallest card sets it, up to the cap. Null when there is nothing to
 * measure, so the caller clears the shared height rather than writing zero.
 */
export function sharedCardHeight(
  heights: readonly number[],
  cap: number = TASK_CARD_HEIGHT_CAP
): number | null {
  let tallest = 0;
  for (const height of heights) tallest = Math.max(tallest, height);
  if (tallest <= 0) return null;
  return Math.min(tallest, cap);
}
