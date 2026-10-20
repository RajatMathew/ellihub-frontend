import { describe, expect, test } from 'bun:test';

import { getProjectCardKey } from '../src/modules/monthly-bills/lib/monthly-bills-bill';
import type { MonthlyBillProjectGroup } from '../src/modules/monthly-bills/schemas/monthly-bills.schema';

/**
 * A project card's React key. A changed key remounts the card, and a remount
 * replaces its table's scroll container: toggling Ready on a table scrolled
 * right used to throw it back to the start, because the key carried each bill's
 * planned amount and Ready flag.
 */

const bill = (id: string, amount: number, isReady: boolean) => ({
  purchaseOrder: { id },
  plannedPayment: amount > 0 || isReady ? { amount, isReady } : null,
});

const group = (bills: ReturnType<typeof bill>[], projectId = 'project-1') =>
  ({
    project: { id: projectId, name: 'Brooklyn Animal Care Center', jobNumber: '28100-25' },
    bills,
  }) as unknown as MonthlyBillProjectGroup;

const september = new Date(2026, 8, 15);

describe('a monthly bills project card', () => {
  test('keeps its identity when a bill is marked ready, so its scroll position stays', () => {
    const before = group([bill('po-1', 100, false), bill('po-2', 100, false)]);
    const after = group([bill('po-1', 100, true), bill('po-2', 100, false)]);

    expect(getProjectCardKey(after, september)).toBe(getProjectCardKey(before, september));
  });

  test('keeps its identity when a planned amount is saved', () => {
    const before = group([bill('po-1', 0, false)]);
    const after = group([bill('po-1', 250, false)]);

    expect(getProjectCardKey(after, september)).toBe(getProjectCardKey(before, september));
  });

  test('is a new card in another month, and for another project', () => {
    const card = group([bill('po-1', 100, true)]);

    expect(getProjectCardKey(card, new Date(2026, 9, 1))).not.toBe(
      getProjectCardKey(card, september)
    );
    expect(getProjectCardKey(group([bill('po-1', 100, true)], 'project-2'), september)).not.toBe(
      getProjectCardKey(card, september)
    );
  });
});
