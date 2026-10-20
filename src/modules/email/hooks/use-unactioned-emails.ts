import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type { EmailListItem } from '@/modules/email/components/email-row-card';
import {
  markEmailHandled,
  nextUnactionedDeadline,
  pruneUnactionedEmails,
  recordEmailOpened,
  selectUnactionedEmails,
  unactionedEmailKey,
  type UnactionedEmail,
  type UnactionedEmailStore,
} from '@/modules/email/lib/email-unactioned';

// elli-ui#1378 — when each Inbox thread was first opened, kept per browser.
const STORAGE_KEY = 'elli.email.openedThreads';
const EMPTY_STORE: UnactionedEmailStore = {};

const listeners = new Set<() => void>();

function isEntry(value: unknown): value is UnactionedEmailStore[string] {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.openedAt === 'number' &&
    (entry.handledAt === undefined || typeof entry.handledAt === 'number')
  );
}

function readStoredValue(): UnactionedEmailStore {
  if (typeof window === 'undefined') return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY_STORE;
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) => isEntry(entry)));
  } catch {
    return EMPTY_STORE;
  }
}

let cachedValue = readStoredValue();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  // Another tab opening or handling a thread updates this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cachedValue = readStoredValue();
    onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot() {
  return cachedValue;
}

function update(change: (store: UnactionedEmailStore) => UnactionedEmailStore) {
  const next = change(cachedValue);
  if (next === cachedValue) return;
  cachedValue = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // Private mode or a full quota: the warning still works for this session.
    console.warn('[email] Could not save opened threads', error);
  }
  listeners.forEach((listener) => listener());
}

/**
 * The Inbox threads the reader opened and walked away from without acting on
 * them (elli-ui#1378). See `lib/email-unactioned.ts` for what counts as acting.
 *
 * `enabled` is the Inbox of a connected mailbox: other folders are where mail
 * goes once it has been dealt with, so opening something there is not a debt.
 */
export function useUnactionedEmails({
  accountId,
  enabled,
  emails,
  openEmail,
}: {
  accountId?: string;
  enabled: boolean;
  emails: readonly EmailListItem[];
  openEmail?: EmailListItem | null;
}) {
  const store = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STORE);
  const [now, setNow] = useState(() => Date.now());

  const openKey =
    enabled && accountId && openEmail ? unactionedEmailKey(accountId, openEmail) : null;

  useEffect(() => {
    if (!openKey) return;
    const openedAt = Date.now();
    update((current) =>
      recordEmailOpened(pruneUnactionedEmails(current, openedAt), openKey, openedAt)
    );
  }, [openKey]);

  // One timer, for the moment the next thread crosses the delay — not a poll.
  useEffect(() => {
    if (!enabled || !accountId) return;
    const deadline = nextUnactionedDeadline({ accountId, emails, store, now });
    if (deadline === null) return;
    const timeout = window.setTimeout(() => setNow(Date.now()), Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [accountId, emails, enabled, now, store]);

  const items = useMemo<UnactionedEmail[]>(
    () => (enabled && accountId ? selectUnactionedEmails({ accountId, emails, store, now }) : []),
    [accountId, emails, enabled, now, store]
  );

  /** A reply, a forward or a meeting response — what the row cannot show. */
  const markHandled = useCallback(
    (email: EmailListItem | null | undefined) => {
      if (!accountId || !email) return;
      update((current) =>
        markEmailHandled(current, unactionedEmailKey(accountId, email), Date.now())
      );
    },
    [accountId]
  );

  return { items, now, markHandled };
}
