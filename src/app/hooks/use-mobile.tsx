import * as React from 'react';

const MOBILE_BREAKPOINT = 1024;
const MOBILE_QUERY = `(min-width: ${MOBILE_BREAKPOINT}px)`;

function getIsMobile() {
  if (typeof window === 'undefined') {
    return false;
  }

  return !window.matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(getIsMobile);

  React.useEffect(() => {
    // Use the same media query semantics as Tailwind's `lg:` breakpoint so the
    // JS-driven layout (sidebar/header rendering) and CSS breakpoint never
    // disagree. `window.innerWidth` includes the scrollbar width while the CSS
    // media query does not, which desyncs them exactly at the 1024px boundary.
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      setIsMobile(!mql.matches);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(!mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
