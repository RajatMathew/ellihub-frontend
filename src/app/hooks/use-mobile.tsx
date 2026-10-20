import * as React from 'react';

const MOBILE_BREAKPOINT = 1024;
const MOBILE_QUERY = `(min-width: ${MOBILE_BREAKPOINT}px)`;

function getIsMobile() {
  if (typeof window === 'undefined') {
    return false;
  }

  return !window.matchMedia(MOBILE_QUERY).matches;
}

// Use the same media query semantics as Tailwind's `lg:` breakpoint so the
// JS-driven layout (sidebar/header rendering) and CSS breakpoint never
// disagree. `window.innerWidth` includes the scrollbar width while the CSS
// media query does not, which desyncs them exactly at the 1024px boundary.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/**
 * Whether the viewport is below the `lg` breakpoint.
 *
 * A media query is an external store, so this reads it with
 * useSyncExternalStore: the first render already has the right value, and a
 * change re-renders once. It used to copy the query into state from an effect,
 * which rendered twice on mount.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getIsMobile, () => false);
}
