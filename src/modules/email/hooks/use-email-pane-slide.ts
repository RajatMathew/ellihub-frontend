import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * The reading pane's slide between conversations (elli-ui#1238).
 *
 * Next brings the new conversation in from the right, Previous from the left,
 * so the pane moves the way the list does. Only those two moves slide — a click
 * on a row far down the list is a jump, not a step, and sliding it would claim
 * a direction that is not there.
 *
 * The slide runs once, when the pane changes conversation. What is on screen at
 * that moment is whatever the pane has: the real thread when it is cached, the
 * list row with skeleton bodies when it is not, or the whole-pane skeleton
 * while Next waits on the next page. The body arriving afterwards fills in
 * place and does not slide again.
 */

export type PaneSlideDirection = 'next' | 'previous';

/** Far enough to read as a direction, short enough not to read as a page turn. */
export const PANE_SLIDE_DISTANCE_PX = 28;
export const PANE_SLIDE_DURATION_MS = 240;
/** The task card's stack uses the same curve; the mail should move like it. */
export const PANE_SLIDE_EASING = 'cubic-bezier(.2,.8,.2,1)';

export function paneSlideKeyframes(direction: PaneSlideDirection): Keyframe[] {
  const offset = direction === 'next' ? PANE_SLIDE_DISTANCE_PX : -PANE_SLIDE_DISTANCE_PX;
  return [
    { transform: `translateX(${offset}px)`, opacity: 0 },
    { transform: 'translateX(0)', opacity: 1 },
  ];
}

/**
 * Next was pressed on the last loaded row, and the page that holds the next
 * conversation is on its way (elli-ui#1237).
 *
 * The pane used to sit on the old message for the whole round trip, so the
 * press looked ignored. While this holds, the pane shows its skeleton instead —
 * the move has happened, the mail just has not arrived.
 *
 * Only while the reader is still on the row they pressed it from, and either a
 * page is in flight or it has landed with a row for the move to open. That last
 * part covers the render between the page landing and the move happening — it
 * is made from an effect — which would otherwise flash the old message back for
 * a frame. A page that lands empty, or a click elsewhere, ends it.
 */
export function isAwaitingNextPage({
  awaitingAfterId,
  selectedEmailId,
  isFetchingNextPage,
  hasRowAfterSelected,
}: {
  /** The row Next was pressed on, or null when nothing is waiting. */
  awaitingAfterId: string | null;
  selectedEmailId: string | null | undefined;
  isFetchingNextPage: boolean;
  /** A row is loaded below the open one. */
  hasRowAfterSelected: boolean;
}): boolean {
  return (
    awaitingAfterId !== null &&
    awaitingAfterId === selectedEmailId &&
    (isFetchingNextPage || hasRowAfterSelected)
  );
}

/**
 * What the pane is showing, as far as sliding is concerned. It changes when the
 * conversation does, and when the pane gives the old one up to wait for the
 * next page — so that wait slides in at the press, and the mail that ends it
 * replaces the skeleton without a second slide.
 */
export function paneSlideKey(selectedEmailId: string | null | undefined, awaiting: boolean) {
  return awaiting ? `awaiting:${selectedEmailId ?? ''}` : (selectedEmailId ?? '');
}

/**
 * Slides the reading pane in when it changes conversation by Next or Previous
 * (elli-ui#1238).
 *
 * The caller says which way it is about to move with the returned function,
 * then moves; the slide runs when `paneKey` changes. A change nobody announced
 * — a row click, a deep link — swaps without one.
 *
 * Web Animations rather than a keyed remount: the pane holds a reply draft and
 * the details card's state, and remounting it to replay a CSS animation would
 * throw both away. The animation leaves no style behind, so the transform it
 * sets never outlives the slide.
 */
export function useEmailPaneSlide<T extends HTMLElement>(
  ref: RefObject<T | null>,
  paneKey: string
) {
  const intent = useRef<PaneSlideDirection | null>(null);

  // Layout, not passive: the new conversation must start offset in the same
  // frame it first paints, or it flashes in place before sliding.
  useLayoutEffect(() => {
    const direction = intent.current;
    intent.current = null;
    const element = ref.current;
    if (!direction || !element || typeof element.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // A held arrow key outruns the slide; start each one from where the last
    // one would have left the pane, not halfway through it.
    for (const animation of element.getAnimations()) animation.cancel();
    element.animate(paneSlideKeyframes(direction), {
      duration: PANE_SLIDE_DURATION_MS,
      easing: PANE_SLIDE_EASING,
    });
  }, [paneKey, ref]);

  return useCallback((direction: PaneSlideDirection) => {
    intent.current = direction;
  }, []);
}
