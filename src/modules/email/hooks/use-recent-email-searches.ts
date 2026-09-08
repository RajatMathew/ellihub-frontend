import { useSyncExternalStore } from 'react';

// elli-ui#699 — recent mail searches, kept per browser rather than per account.
const STORAGE_KEY = 'elli.email.recentSearches';
const MAX_RECENT_SEARCHES = 8;

const listeners = new Set<() => void>();

function readStoredValue(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

let cachedValue = readStoredValue();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return cachedValue;
}

function persist(next: string[]) {
  cachedValue = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function addRecentEmailSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;

  const deduped = cachedValue.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase());
  persist([trimmed, ...deduped].slice(0, MAX_RECENT_SEARCHES));
}

export function clearRecentEmailSearches() {
  persist([]);
}

/** Recent mail search terms, most recent first — a persisted, per-browser list. */
export function useRecentEmailSearches(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => []);
}
