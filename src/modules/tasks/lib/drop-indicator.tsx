import type { ReactNode } from 'react';

/**
 * The cards with a line drawn in the gap the dragged one will land in.
 *
 * A line between the cards rather than an overlay on top of them: it sits in
 * the same flex column, so it opens the gap it is describing and never has to
 * track anyone's height.
 *
 * The cards are passed straight through, by reference. That is the whole point
 * of this function and the reason it is not written with `React.Children`:
 * `Children.toArray` returns *clones* with rewritten keys (`a` becomes `.$a`),
 * so the moment the indicator appeared React saw a column of entirely new
 * children and unmounted and remounted every card. Mid-drag that pulls the node
 * dnd-kit is dragging out from under it; dnd-kit re-registers, which renders,
 * which remounts again — "Maximum update depth exceeded" and the error boundary
 * swallowing the board.
 *
 * Slicing the array the board already built keeps every card the same element
 * with the same key, so React adds one node and moves nothing.
 */
export function withDropIndicator(children: ReactNode, _slot: number | null): ReactNode {
  // The line was drawn in the gap the dragged card would land in; the
  // placeholder slot the card itself leaves already says that now, so the
  // extra rule was a second, redundant "here" underneath it.
  return children;
}
