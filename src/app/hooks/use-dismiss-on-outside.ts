import { useEffect, useRef, type RefObject } from 'react';

/**
 * Closes a hand-rolled popover the way a Radix one closes: a pointer down
 * anywhere outside it, or Escape. Anything inside an element marked
 * `data-popover-ignore` (the button that opens it) is not "outside", so that
 * button's click toggles the popover instead of closing and reopening it.
 */
export function useDismissOnOutside(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void
) {
  // The latest callback, read when the event fires, so callers can pass an
  // inline arrow without the listeners being torn down every render.
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (ref.current?.contains(target) || target.closest('[data-popover-ignore]')) return;
      dismiss.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss.current();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, ref]);
}
