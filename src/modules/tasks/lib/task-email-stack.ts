/**
 * The geometry of a task card's email stack (elli-ui#1479).
 *
 * At rest the emails a task was raised from sit as a pile: the first one in
 * front, one sheet peeking out beneath it, the rest hidden behind. Pointed at
 * or tabbed into, the pile fans out into a list, every row in full. Each row
 * is absolutely placed and moved with a transform, so the change animates
 * rather than jumping — which is why the container needs an explicit height.
 */

/** A row's height, in px. */
export const EMAIL_STACK_ROW_HEIGHT = 48;
/** A row's height when it also carries the record its email is linked to. */
export const EMAIL_STACK_LINKED_ROW_HEIGHT = 66;
/** The gap between rows once fanned out. */
export const EMAIL_STACK_ROW_GAP = 8;
/** How far each sheet behind the front one shows below it. */
export const EMAIL_STACK_PEEK = 6;
/** How many sheets show behind the front one at rest. */
export const EMAIL_STACK_MAX_PEEK = 1;
/** How much smaller each sheet behind is drawn, per step back. */
const SHRINK_PER_STEP = 0.035;

/**
 * How tall every row in the stack is. One height for all of them, so the
 * sheets in the pile line up: if any email carries a linked record, every row
 * makes room for one.
 */
export function emailStackRowHeight(anyLinked: boolean): number {
  return anyLinked ? EMAIL_STACK_LINKED_ROW_HEIGHT : EMAIL_STACK_ROW_HEIGHT;
}

/** The container's height: the pile at rest, every row once open. */
export function emailStackHeight(
  count: number,
  open: boolean,
  rowHeight: number = EMAIL_STACK_ROW_HEIGHT
): number {
  if (count <= 0) return 0;
  if (open && count > 1) {
    return count * rowHeight + (count - 1) * EMAIL_STACK_ROW_GAP;
  }
  return rowHeight + Math.min(count - 1, EMAIL_STACK_MAX_PEEK) * EMAIL_STACK_PEEK;
}

/** Where one row sits, as a CSS transform, and whether it shows at all. */
export function emailStackRowPlacement(
  index: number,
  open: boolean,
  rowHeight: number = EMAIL_STACK_ROW_HEIGHT
): { transform: string; visible: boolean } {
  if (open) {
    return {
      transform: `translateY(${index * (rowHeight + EMAIL_STACK_ROW_GAP)}px)`,
      visible: true,
    };
  }
  if (index === 0) return { transform: 'none', visible: true };
  const step = Math.min(index, EMAIL_STACK_MAX_PEEK);
  return {
    transform: `translateY(${step * EMAIL_STACK_PEEK}px) scale(${1 - step * SHRINK_PER_STEP})`,
    visible: index <= EMAIL_STACK_MAX_PEEK,
  };
}
