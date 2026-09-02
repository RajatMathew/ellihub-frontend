import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Which card just changed column, so it can be highlighted where it lands.
 *
 * Held for a moment and then cleared: the highlight marks an event, and a card
 * that stayed ringed would read as a state the task is in.
 *
 * The id is dropped for a frame before being set again, so that clicking the
 * same card twice replays the highlight. A CSS animation only restarts when its
 * class actually leaves the element, and without this the second click on a card
 * still lit from the first would show nothing at all.
 */
export function useJustLandedTask(holdMs = 1200) {
  const [justLandedId, setJustLandedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);

  const markLanded = useCallback(
    (taskId: string) => {
      if (timer.current) clearTimeout(timer.current);
      if (frame.current) cancelAnimationFrame(frame.current);

      setJustLandedId(null);
      frame.current = requestAnimationFrame(() => {
        setJustLandedId(taskId);
        timer.current = setTimeout(() => setJustLandedId(null), holdMs);
      });
    },
    [holdMs]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    []
  );

  return { justLandedId, markLanded };
}
