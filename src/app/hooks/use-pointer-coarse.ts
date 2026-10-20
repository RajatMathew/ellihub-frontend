import * as React from 'react';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

function getIsCoarsePointer() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(COARSE_POINTER_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/**
 * Whether the primary input is a coarse pointer (touch) rather than a mouse
 * or trackpad.
 *
 * This is the same media feature the mailbox's `pointer-coarse:` Tailwind
 * classes key the row's icon buttons on (`email-row-card.tsx`), which step
 * aside on touch for the swipe drawer — a JS-driven gesture that takes over
 * from them has to ask the same question, or a touch laptop with a mouse
 * attached could end up with both, or with neither.
 */
export function usePointerCoarse() {
  return React.useSyncExternalStore(subscribe, getIsCoarsePointer, () => false);
}
