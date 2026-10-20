/**
 * How many people fit in the assignee filter track, and in what order.
 *
 * The track is one row: `Everyone`, then a run of people, then a `+N more`
 * pill that opens the full list. Nothing wraps and nothing scrolls, so the run
 * has to be cut to the width the track actually has. The caller measures the
 * pills - every one, in a hidden row - and this works out the cut, so the
 * arithmetic can be tested without a browser.
 *
 * Two things a plain "take pills until full" gets wrong:
 *
 * - The `+N more` pill needs its own room, but only if somebody is left over.
 *   So the whole run is tried first, and only when that overflows is space
 *   held back for the overflow pill.
 * - The chosen people must stay in view. The track keeps the server's order
 *   while every choice is among the pills that fit, and moves the chosen ones
 *   to the front only when one of them would otherwise be hidden - so ticking
 *   a visible pill does not shuffle the row under the pointer.
 */
export interface FilterPillLayoutInput {
  /** Inner width of the track, with its padding and border already removed. */
  available: number;
  /** Width of the `Everyone` pill, which is always shown. */
  everyoneWidth: number;
  /** Width of each person's pill, in the order the people arrived. */
  widths: number[];
  /** Width of the `+N more` pill at its widest count. */
  moreWidth: number;
  /** The gap between neighbouring pills. */
  gap: number;
  /** Indices into `widths` of the chosen people. */
  selected: number[];
}

export interface FilterPillLayout {
  /** Indices into the people list, in the order the track draws them. */
  order: number[];
  /** How many of `order` are drawn as pills; the rest live behind `+N more`. */
  shown: number;
}

export function layoutFilterPills({
  available,
  everyoneWidth,
  widths,
  moreWidth,
  gap,
  selected,
}: FilterPillLayoutInput): FilterPillLayout {
  const natural = widths.map((_, index) => index);
  const shown = fitCount(natural, { available, everyoneWidth, widths, moreWidth, gap });

  const chosen = natural.filter((index) => selected.includes(index));
  if (chosen.every((index) => index < shown)) {
    return { order: natural, shown };
  }

  const pinned = [...chosen, ...natural.filter((index) => !selected.includes(index))];
  return {
    order: pinned,
    shown: fitCount(pinned, { available, everyoneWidth, widths, moreWidth, gap }),
  };
}

function fitCount(
  order: number[],
  { available, everyoneWidth, widths, moreWidth, gap }: Omit<FilterPillLayoutInput, 'selected'>
): number {
  const total = order.reduce((sum, index) => sum + gap + widths[index], everyoneWidth);
  if (total <= available) return order.length;

  let used = everyoneWidth;
  let count = 0;
  for (const index of order) {
    const next = used + gap + widths[index];
    if (next + gap + moreWidth > available) break;
    used = next;
    count += 1;
  }
  return count;
}
