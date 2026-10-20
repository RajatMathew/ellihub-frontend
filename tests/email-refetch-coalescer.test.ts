import { describe, expect, test } from 'bun:test';

import {
  createEmailRefetchCoalescer,
  type CoalescerTimers,
} from '../src/modules/email/lib/email-refetch-coalescer';

/** A clock the test advances by hand. */
function manualTimers() {
  let now = 0;
  let nextId = 1;
  const queue = new Map<number, { at: number; callback: () => void }>();
  const timers: CoalescerTimers = {
    setTimeout: (callback, ms) => {
      const id = nextId++;
      queue.set(id, { at: now + ms, callback });
      return id;
    },
    clearTimeout: (id) => {
      queue.delete(id);
    },
  };
  const advance = (ms: number) => {
    now += ms;
    for (const [id, entry] of [...queue].sort((a, b) => a[1].at - b[1].at)) {
      if (entry.at > now) continue;
      queue.delete(id);
      entry.callback();
    }
  };
  return { timers, advance, pendingCount: () => queue.size };
}

describe('email refetch coalescer', () => {
  test('refetches a second mailbox whose sync lands inside the first one’s window', () => {
    const { timers, advance } = manualTimers();
    const flushed: string[] = [];
    const coalescer = createEmailRefetchCoalescer(1500, (id) => flushed.push(id), timers);

    coalescer.schedule('account-a');
    advance(400);
    coalescer.schedule('account-b');
    advance(1100);

    expect(flushed.sort()).toEqual(['account-a', 'account-b']);
  });

  test('a burst for one mailbox still refetches it once, on one timer', () => {
    const { timers, advance, pendingCount } = manualTimers();
    const flushed: string[] = [];
    const coalescer = createEmailRefetchCoalescer(1500, (id) => flushed.push(id), timers);

    coalescer.schedule('account-a');
    coalescer.schedule('account-a');
    coalescer.schedule('account-a');
    expect(pendingCount()).toBe(1);

    advance(1500);
    expect(flushed).toEqual(['account-a']);
  });

  test('does not refetch before the window closes', () => {
    const { timers, advance } = manualTimers();
    const flushed: string[] = [];
    const coalescer = createEmailRefetchCoalescer(1500, (id) => flushed.push(id), timers);

    coalescer.schedule('account-a');
    advance(1499);
    expect(flushed).toEqual([]);
  });

  test('an event after the window opens a fresh one', () => {
    const { timers, advance } = manualTimers();
    const flushed: string[] = [];
    const coalescer = createEmailRefetchCoalescer(1500, (id) => flushed.push(id), timers);

    coalescer.schedule('account-a');
    advance(1500);
    coalescer.schedule('account-b');
    advance(1500);

    expect(flushed).toEqual(['account-a', 'account-b']);
  });

  test('cancel drops what was pending, so an unmounted mailbox refetches nothing', () => {
    const { timers, advance, pendingCount } = manualTimers();
    const flushed: string[] = [];
    const coalescer = createEmailRefetchCoalescer(1500, (id) => flushed.push(id), timers);

    coalescer.schedule('account-a');
    coalescer.cancel();
    advance(1500);

    expect(flushed).toEqual([]);
    expect(pendingCount()).toBe(0);
  });
});
