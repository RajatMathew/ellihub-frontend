import { useSyncExternalStore } from 'react';

import { parseCollapseLongEmails } from '@/modules/email/lib/email-body-clamp';

// Workspace-wide like the avatar toggle (elli-ui#804), not per-account — a
// reader who wants whole messages wants them in every mailbox they open.
const STORAGE_KEY = 'elli.email.collapseLongEmails';

const listeners = new Set<() => void>();

function readStoredValue(): boolean {
  if (typeof window === 'undefined') return true;
  return parseCollapseLongEmails(window.localStorage.getItem(STORAGE_KEY));
}

let cachedValue = readStoredValue();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return cachedValue;
}

export function setCollapseLongEmails(next: boolean) {
  cachedValue = next;
  window.localStorage.setItem(STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}

/** Whether long message bodies fold behind "Show more" — a persisted, workspace-wide toggle. */
export function useCollapseLongEmails(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
