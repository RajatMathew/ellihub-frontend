/**
 * Height past which a body is folded, in px. Roughly a screenful on a laptop:
 * enough that a normal mail is never clamped, low enough that a signature
 * block plus a quoted chain always is.
 */
export const CLAMP_HEIGHT = 560;

/**
 * Slack in the measurement. A body a hair taller than the limit would
 * otherwise get a "Show more" that reveals twenty pixels.
 */
export const CLAMP_TOLERANCE = 80;

/**
 * Reads the stored "collapse long emails" preference. Folding is the default,
 * so only an explicit `'false'` turns it off — an absent key, or a value
 * something else wrote there, keeps the behaviour the reader already had.
 */
export function parseCollapseLongEmails(stored: string | null): boolean {
  return stored !== 'false';
}

/**
 * Whether a body of this rendered height gets folded behind "Show more".
 * Never, once the reader has turned collapsing off — however long the body is.
 */
export function bodyOverflowsClamp(contentHeight: number, collapseEnabled: boolean): boolean {
  if (!collapseEnabled) return false;
  return contentHeight > CLAMP_HEIGHT + CLAMP_TOLERANCE;
}

/** How long the fold's own `max-height` transition runs (`duration-300`), plus slack. */
export const CLAMP_TRANSITION_MS = 350;

/**
 * The fold's `max-height`. Expanded and at rest it is uncapped: a cap at the
 * last measured height trails every change in the body by a ResizeObserver
 * round trip and a 300ms transition, which clipped the quoted chain's open
 * animation and cut off its bounce (elli-ui#1293). A number is only needed
 * while "Show more" / "Show less" is itself animating, because `max-height`
 * cannot transition to or from `none`.
 */
export function clampMaxHeight({
  overflows,
  expanded,
  toggling,
  contentHeight,
}: {
  overflows: boolean;
  expanded: boolean;
  toggling: boolean;
  contentHeight: number;
}): number | undefined {
  if (!overflows) return undefined;
  if (!expanded) return CLAMP_HEIGHT;
  return toggling ? contentHeight : undefined;
}
