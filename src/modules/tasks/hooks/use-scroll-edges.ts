import { useCallback, useEffect, useRef, useState } from 'react';

const EPSILON = 2;

/**
 * Tracks whether a scroll container is at its start or its end, as data
 * attributes for `scroll-fade` to read.
 *
 * A container that cannot scroll counts as being at both ends, so a short list
 * gets no fade at all without the caller having to check.
 *
 * Deliberately not the pure-CSS scroll-driven version: its timeline never
 * advanced in testing, leaving the mask pinned at its at-rest values however far
 * the container was scrolled.
 */
export function useScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const vertical = el.scrollHeight > el.clientHeight;
    const position = vertical ? el.scrollTop : el.scrollLeft;
    const overflow = vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;

    const next = {
      atStart: position <= EPSILON,
      atEnd: overflow <= EPSILON || position >= overflow - EPSILON,
    };

    setEdges((current) =>
      current.atStart === next.atStart && current.atEnd === next.atEnd ? current : next
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    measure();
    el.addEventListener('scroll', measure, { passive: true });

    // Cards arriving, leaving or being resized changes whether it overflows at
    // all, which no scroll event would report.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);

    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  return {
    ref,
    scrollEdgeProps: {
      'data-scroll-at-start': String(edges.atStart),
      'data-scroll-at-end': String(edges.atEnd),
    },
  };
}
