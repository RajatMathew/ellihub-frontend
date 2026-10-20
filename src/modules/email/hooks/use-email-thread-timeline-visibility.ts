import { useSyncExternalStore } from 'react';

// A workspace-wide preference, not per-account — one person's view choice
// shouldn't need setting again per mailbox they open. Mirrors
// `use-email-avatar-visibility.ts`.
const STORAGE_KEY = 'elli.email.showThreadTimeline';

const listeners = new Set<() => void>();

/**
 * Off unless the user has turned it on — "Email only" is the default view, so a
 * missing or unrecognised stored value reads as off.
 */
export function parseStoredThreadTimeline(stored: string | null): boolean {
  return stored === 'true';
}

function readStoredValue(): boolean {
  if (typeof window === 'undefined') return false;
  return parseStoredThreadTimeline(window.localStorage.getItem(STORAGE_KEY));
}

let cachedValue = readStoredValue();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return cachedValue;
}

export function setShowEmailThreadTimeline(next: boolean) {
  cachedValue = next;
  window.localStorage.setItem(STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}

/** Whether each message shows its "what this made someone do" actions — a persisted, workspace-wide toggle. */
export function useShowEmailThreadTimeline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
