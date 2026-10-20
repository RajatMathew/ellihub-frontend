import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * A control a page puts in the app header beside Feedback (the mailbox's
 * Elliot button). The header is drawn by the shell from a static route
 * config, so the page sets it here and the header reads it; no provider, like
 * `useIsMobile`.
 */
let current: ReactNode = null;
const listeners = new Set<() => void>();

export function setHeaderAction(node: ReactNode) {
  current = node;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHeaderAction(): ReactNode {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  );
}
