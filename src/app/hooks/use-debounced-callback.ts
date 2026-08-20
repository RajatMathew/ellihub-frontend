import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface CancellableDebouncedCallback<TValue> {
  run: (value: TValue) => void;
  /**
   * Drop a pending invocation. Call this before clearing a value or accepting an
   * external one (browser back/forward), so stale in-flight input cannot
   * resurrect a value the user already cleared.
   */
  cancel: () => void;
}

function useDebouncedController<TValue>(
  callback: (value: TValue) => void,
  delayMs: number
): CancellableDebouncedCallback<TValue> {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current === undefined) return;

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
    [cancel, delayMs]
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ cancel, run }), [cancel, run]);
}

/**
 * Debounce that can also drop a pending invocation.
 *
 * Prefer this when the debounced value is mirrored somewhere that can change
 * externally — URL state, for instance — so the external change can cancel any
 * keystroke still in flight.
 */
export function useCancellableDebouncedCallback<TValue>(
  callback: (value: TValue) => void,
  delayMs: number
): CancellableDebouncedCallback<TValue> {
  return useDebouncedController(callback, delayMs);
}

export function useDebouncedCallback<TValue>(callback: (value: TValue) => void, delayMs: number) {
  return useDebouncedController(callback, delayMs).run;
}
