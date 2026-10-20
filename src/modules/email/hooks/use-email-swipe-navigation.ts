import { useEffect, useRef, type RefObject } from 'react';

import {
  isHorizontalDrag,
  resolveSwipeDirection,
} from '@/modules/email/lib/email-swipe-navigation';

interface UseEmailSwipeNavigationOptions {
  onPrevious?: () => void;
  onNext?: () => void;
  /** Off on desktop — a mouse trackpad drag over the pane must still scroll. */
  enabled: boolean;
}

/**
 * Gmail-style swipe between conversations on mobile: swipe left for the next
 * email, right for the previous one (elli-ui#1068) — the touch equivalent of
 * the reading pane's `<`/`>` buttons.
 *
 * Wired with native listeners rather than React's `onTouchMove` prop: React
 * attaches its synthetic touch handlers as passive, so `preventDefault` inside
 * one is silently ignored, and without it a confirmed sideways swipe would
 * scroll the thread vertically at the same time. `touchmove` alone is
 * non-passive; `touchstart`/`touchend`/`touchcancel` stay passive since
 * nothing here needs to block them.
 */
export function useEmailSwipeNavigation<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { onPrevious, onNext, enabled }: UseEmailSwipeNavigationOptions
) {
  // Read through a ref so the effect below can stay mounted for the pane's
  // whole lifetime instead of re-subscribing every time the neighbours change
  // (which happens on every navigation, i.e. constantly).
  const handlers = useRef({ onPrevious, onNext });
  useEffect(() => {
    handlers.current = { onPrevious, onNext };
  });

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;

    let start: { x: number; y: number; time: number } | null = null;
    let dragging = false;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      const touch = event.touches[0]!;
      start = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
      dragging = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      const current = { x: touch.clientX, y: touch.clientY };
      if (dragging || isHorizontalDrag(start, current)) {
        dragging = true;
        // Own the gesture once it reads as sideways — the pane must not also
        // scroll the thread underneath it.
        event.preventDefault();
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      const begin = start;
      start = null;
      const wasDragging = dragging;
      dragging = false;
      if (!begin || !wasDragging) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const direction = resolveSwipeDirection(
        begin,
        { x: touch.clientX, y: touch.clientY },
        event.timeStamp - begin.time
      );
      if (direction === 'left') handlers.current.onNext?.();
      if (direction === 'right') handlers.current.onPrevious?.();
    };

    const onTouchCancel = () => {
      start = null;
      dragging = false;
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    node.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [ref, enabled]);
}
