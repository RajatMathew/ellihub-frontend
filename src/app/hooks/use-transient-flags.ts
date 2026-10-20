import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Marks for rows that something just went wrong with, each held for a moment
 * and then cleared — an error that stayed lit would read as a state the row is
 * in, not an event.
 *
 * Each mark is a counter, not a boolean: flagging a row that is already marked
 * changes its value, so a consumer keyed on it (a shake) plays again.
 */
export function useTransientFlags(holdMs = 3000) {
  const [flags, setFlags] = useState<Record<string, number>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const counter = useRef(0);

  const clear = useCallback((ids: string[]) => {
    for (const id of ids) {
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
    }
    setFlags((current) => {
      if (!ids.some((id) => id in current)) return current;
      const next = { ...current };
      for (const id of ids) delete next[id];
      return next;
    });
  }, []);

  const flag = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;

      const marks: Record<string, number> = {};
      for (const id of ids) {
        counter.current += 1;
        marks[id] = counter.current;
        clearTimeout(timers.current.get(id));
        timers.current.set(
          id,
          setTimeout(() => clear([id]), holdMs)
        );
      }
      setFlags((current) => ({ ...current, ...marks }));
    },
    [clear, holdMs]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, []);

  return { flags, flag, clear };
}
