import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCallback<TValue>(
  callback: (value: TValue) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (!timeoutRef.current) return;

    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }, []);

  const run = useCallback(
    (value: TValue) => {
      cancel();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined;
        callbackRef.current(value);
      }, delayMs);
    },
    [cancel, delayMs],
  );

  useEffect(() => cancel, [cancel]);

  return run;
}
