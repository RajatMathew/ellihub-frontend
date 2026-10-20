import { useSyncExternalStore } from 'react';

// A workspace-wide preference (elli-ui#804), not per-account — one person's
// dense-list taste shouldn't need setting again per mailbox they open.
const STORAGE_KEY = 'elli.email.showAvatars';

const listeners = new Set<() => void>();

function readStoredValue(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'false';
}

let cachedValue = readStoredValue();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return cachedValue;
}

export function setShowEmailAvatars(next: boolean) {
  cachedValue = next;
  window.localStorage.setItem(STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}

/** Whether sender avatars should render in the mail list — a persisted, workspace-wide toggle. */
export function useShowEmailAvatars(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
