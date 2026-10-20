/** The timer functions the coalescer needs; injected so a test owns the clock. */
export interface CoalescerTimers {
  setTimeout: (callback: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
}

export interface EmailRefetchCoalescer {
  /** Ask for `accountId` to be refetched at the end of the current window. */
  schedule: (accountId: string) => void;
  /** Drop anything pending without refetching it. */
  cancel: () => void;
}

/**
 * Collapses a burst of `email.synced` events into one refetch per account.
 *
 * Several messages landing at once is one sync as far as the views are
 * concerned, so the first event opens a window and the rest join it. Every
 * account that asked during the window is refetched when it closes — not only
 * the first. Keeping just the first is what let a second mailbox's sync, landing
 * within the window, be dropped and its open list stay stale until the next
 * event.
 */
export function createEmailRefetchCoalescer(
  delayMs: number,
  onFlush: (accountId: string) => void,
  timers: CoalescerTimers = {
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  }
): EmailRefetchCoalescer {
  const pending = new Set<string>();
  let timer: number | null = null;

  return {
    schedule(accountId) {
      pending.add(accountId);
      if (timer !== null) return;
      timer = timers.setTimeout(() => {
        timer = null;
        const accountIds = [...pending];
        pending.clear();
        for (const id of accountIds) onFlush(id);
      }, delayMs);
    },
    cancel() {
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      pending.clear();
    },
  };
}
