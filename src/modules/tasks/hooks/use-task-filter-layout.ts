import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { layoutFilterPills, type FilterPillLayout } from '@/modules/tasks/lib/task-filter-layout';

/**
 * Fits the assignee filter's pills to the width the track has.
 *
 * The caller renders every pill twice: once in the visible track, cut to
 * `shown`, and once in a hidden measuring row that is never cut. Only the
 * hidden row is measured, so a pill's width is known whether or not it is on
 * screen, and the cut is recomputed from a `ResizeObserver` on the track's
 * container and on the row itself - the row moves when the roster changes or
 * a font finishes loading, the container when the viewport does.
 *
 * The container is measured rather than the track because the track is
 * `w-fit`: its width follows its contents, and a measurement that follows the
 * thing it decides would chase itself. The container's width is the page's.
 */
export function useTaskFilterLayout({ count, selected }: { count: number; selected: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  // Nobody until measured: a first frame with everybody would run past the
  // track's edge, where a first frame with only `+N more` just looks brief.
  const [layout, setLayout] = useState<FilterPillLayout>(() => ({
    order: Array.from({ length: count }, (_, index) => index),
    shown: 0,
  }));

  // A fresh array every render would re-run the effect every render; the
  // effect wants to run when the choice changes, and this is the choice.
  const selectedKey = selected.join(',');

  useLayoutEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    const row = measureRef.current;
    if (!container || !track || !row) return;
    const chosen = selectedKey === '' ? [] : selectedKey.split(',').map(Number);

    const compute = () => {
      // The row is `Everyone`, one pill per person, then `+N more`.
      const rects = Array.from(row.children, (child) => child.getBoundingClientRect());
      if (rects.length < 2) return;
      const everyone = rects[0];
      const more = rects[rects.length - 1];
      const people = rects.slice(1, -1);
      const gap = people.length > 0 ? people[0].left - everyone.right : 0;

      const style = getComputedStyle(track);
      const chrome =
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight) +
        parseFloat(style.borderLeftWidth) +
        parseFloat(style.borderRightWidth);

      const next = layoutFilterPills({
        available: container.clientWidth - chrome,
        everyoneWidth: everyone.width,
        widths: people.map((rect) => rect.width),
        moreWidth: more.width,
        gap,
        selected: chosen,
      });

      // Synchronous so the cut lands in the frame the observer measured, not
      // the one after - otherwise every resize paints the old cut first.
      flushSync(() => {
        setLayout((current) =>
          current.shown === next.shown && sameOrder(current.order, next.order) ? current : next
        );
      });
    };

    const observer = new ResizeObserver(compute);
    observer.observe(container);
    observer.observe(row);
    return () => observer.disconnect();
  }, [count, selectedKey]);

  return { containerRef, trackRef, measureRef, layout };
}

function sameOrder(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
