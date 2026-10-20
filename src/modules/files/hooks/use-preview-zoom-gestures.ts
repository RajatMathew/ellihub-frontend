import { useEffect, useRef, type RefObject } from 'react';

import {
  applyZoomUpdates,
  pinchZoom,
  touchDistance,
  wheelZoom,
} from '@/modules/files/lib/preview-zoom';

type ZoomUpdate = (update: (zoom: number) => number) => void;

/** Safari's trackpad pinch. Not in the DOM typings; WebKit only. */
interface GestureEvent extends UIEvent {
  scale: number;
}

/**
 * Zoom a preview (a sheet, a Word document) the ways Excel, Word and a browser
 * user expect, instead of zooming the page:
 *
 * - **Ctrl/⌘ + scroll**, and a trackpad pinch in Chrome, Edge and Firefox,
 *   which report it as a wheel event with `ctrlKey`.
 * - **Trackpad pinch in Safari**, which sends `gesturestart` / `gesturechange`
 *   with a `scale` instead.
 * - **Two-finger pinch on a touchscreen.** One finger still scrolls; the
 *   container sets `touch-action: pan-x pan-y` so the browser pans but leaves
 *   the pinch to us.
 *
 * Native listeners, because React's are passive and cannot stop the browser's
 * own zoom. `active` re-attaches them when the scroll container remounts.
 *
 * A pinch reads the zoom it starts from out of a ref, synchronously: a state
 * updater may run after the first move event has already arrived.
 *
 * A trackpad sends several wheel events per frame; they are queued and applied
 * once per animation frame, so the preview re-renders at most once a frame.
 */
export function usePreviewZoomGestures(
  ref: RefObject<HTMLElement | null>,
  zoom: number,
  onZoomChange: ZoomUpdate,
  active: unknown
): void {
  const onZoomChangeRef = useRef(onZoomChange);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
    zoomRef.current = zoom;
  }, [onZoomChange, zoom]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let queued: ((zoom: number) => number)[] = [];
    let frame = 0;
    const update: ZoomUpdate = (next) => {
      queued.push(next);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const updates = queued;
        queued = [];
        onZoomChangeRef.current((zoom) => applyZoomUpdates(zoom, updates));
      });
    };
    // The zoom a pinch began at; every step is measured from it.
    let pinchStart: { zoom: number; distance: number } | null = null;
    let gestureStartZoom: number | null = null;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      update((zoom) => wheelZoom(zoom, event.deltaY));
    };

    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStartZoom = zoomRef.current;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const { scale } = event as GestureEvent;
      const start = gestureStartZoom ?? zoomRef.current;
      update(() => pinchZoom(start, scale));
    };
    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      gestureStartZoom = null;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      pinchStart = {
        zoom: zoomRef.current,
        distance: touchDistance(event.touches[0]!, event.touches[1]!),
      };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchStart || pinchStart.distance === 0) return;
      event.preventDefault();
      const { zoom: start, distance } = pinchStart;
      const scale = touchDistance(event.touches[0]!, event.touches[1]!) / distance;
      update(() => pinchZoom(start, scale));
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchStart = null;
    };

    const options = { passive: false } as const;
    element.addEventListener('wheel', onWheel, options);
    element.addEventListener('gesturestart', onGestureStart, options);
    element.addEventListener('gesturechange', onGestureChange, options);
    element.addEventListener('gestureend', onGestureEnd, options);
    element.addEventListener('touchstart', onTouchStart, options);
    element.addEventListener('touchmove', onTouchMove, options);
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('gesturestart', onGestureStart);
      element.removeEventListener('gesturechange', onGestureChange);
      element.removeEventListener('gestureend', onGestureEnd);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [ref, active]);
}
