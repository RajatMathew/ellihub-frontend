import { useEffect, useState } from 'react';

/**
 * True while `value` is true, and for `ms` after it turns false: long enough
 * for an exit animation to play before the element unmounts. Without it a
 * panel that is conditionally rendered vanishes on the same frame it closes.
 */
export function useLingering(value: boolean, ms: number): boolean {
  const [lingering, setLingering] = useState(false);
  const [previous, setPrevious] = useState(value);
  if (previous !== value) {
    setPrevious(value);
    if (!value) setLingering(true);
  }

  useEffect(() => {
    if (value) return;
    const timer = window.setTimeout(() => setLingering(false), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);

  return value || lingering;
}
