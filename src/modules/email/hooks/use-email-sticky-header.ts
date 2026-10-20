import { useSyncExternalStore } from 'react';

import { parseStickyMessageHeader } from '@/modules/email/lib/email-sticky-header';

// Workspace-wide like the other display settings (elli-ui#804), not
// per-account — a reader who wants the header to scroll away wants it in
// every mailbox they open.
const STORAGE_KEY = 'elli.email.stickyMessageHeader';

const listeners = new Set<() => void>();

function readStoredValue(): boolean {
  if (typeof window === 'undefined') return true;
  return parseStickyMessageHeader(window.localStorage.getItem(STORAGE_KEY));
}

let cachedValue = readStoredValue();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return cachedValue;
}

export function setStickyMessageHeader(next: boolean) {
  cachedValue = next;
  window.localStorage.setItem(STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}

/** Whether an open message's header pins while its body scrolls — a persisted, workspace-wide toggle. */
export function useStickyMessageHeader(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
