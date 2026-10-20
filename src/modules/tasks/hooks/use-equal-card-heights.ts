import { useLayoutEffect, useRef } from 'react';

import { sharedCardHeight } from '@/modules/tasks/lib/task-card-height';

/** The CSS variable every card reads its minimum height from. */
export const TASK_CARD_HEIGHT_VAR = '--task-card-height';

/** How a card marks itself as one of the things to measure. */
export const TASK_CARD_SELECTOR = '[data-task-card]';

/**
 * Makes every card on the board the height of the tallest one, up to a point.
 *
 * Measured rather than fixed: the right height is whatever the longest title
 * and body on the board need, and that changes with every task. The tallest
 * card's natural height, capped, is written to a CSS variable on the root, and
 * each card takes it as a minimum, so the rest stretch up to meet it and the
 * space opens between a card's body and its footer. A card taller than the
 * cap keeps its own height alone.
 *
 * The variable is cleared before each read. A card already stretched to the
 * last answer would otherwise report that height, and the tallest card could
 * never get shorter after the task that set it was completed or edited.
 *
 * Runs again whenever the content changes (the caller passes what the cards
 * are drawn from) and whenever the root is resized, since a narrower column
 * wraps more lines.
 *
 * `useLayoutEffect` so the first paint already has the answer; a card that
 * stretched a frame after it appeared would be seen doing it.
 */
export function useEqualCardHeights<T extends HTMLElement>(content: unknown) {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const measure = () => {
      root.style.removeProperty(TASK_CARD_HEIGHT_VAR);

      const heights: number[] = [];
      root.querySelectorAll<HTMLElement>(TASK_CARD_SELECTOR).forEach((card) => {
        heights.push(card.offsetHeight);
      });

      // Capped: see TASK_CARD_HEIGHT_CAP for how far a short card will follow.
      const height = sharedCardHeight(heights);
      if (height !== null) root.style.setProperty(TASK_CARD_HEIGHT_VAR, `${height}px`);
    };

    measure();

    // Only the root is observed, never the cards: writing the variable changes
    // every card's size, and an observer on the cards would answer its own
    // notification forever.
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
    // `content` is the trigger, not an input: a new board means new heights.
  }, [content]);

  return ref;
}
