import type { ReactNode } from 'react';

import { useDndContext } from '@dnd-kit/core';
import { motion, useReducedMotion } from 'motion/react';

/**
 * The motion a card gets when the board rearranges without a drag.
 *
 * Ticking a card used to be a jump: it vanished from its column, the cards
 * below snapped up to close the gap, and it appeared in Completed already
 * there. Dragging the same card is smooth, which is what made the tick look
 * broken by comparison — see elli-ui#862.
 *
 * So the card fades out where it sat and the ones below slide up after it, the
 * same reflow a drag gives. The spring is the one the files grid already uses,
 * so the two read as the same product.
 */
export function TaskBoardCardSlot({ children }: { children: ReactNode }) {
  const { active } = useDndContext();
  const reducedMotion = useReducedMotion();

  // Layout animation is off while anything is being dragged. dnd-kit is already
  // translating these cards to open a gap under the pointer, and a second
  // opinion about where the card belongs fights it for the same frames — the
  // card judders and the gap lands late. The drag has its own motion; this is
  // only for the rearrangements that have none.
  const isDragging = Boolean(active);

  return (
    <motion.div
      // `position` rather than a full layout animation: the card's own size is
      // not what changed, only where it sits, and animating the box as well
      // makes the contents stretch as it travels.
      layout={isDragging || reducedMotion ? false : 'position'}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
    >
      {children}
    </motion.div>
  );
}
