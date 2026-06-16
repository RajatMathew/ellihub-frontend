import { useEffect, useRef, useState } from 'react';

export function useStickyHeaderHeight<TElement extends HTMLElement>() {
  const headerRef = useRef<TElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderHeight = () => setHeaderHeight(header.offsetHeight);
    updateHeaderHeight();

    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);

    return () => observer.disconnect();
  }, []);

  return { headerRef, headerHeight };
}
