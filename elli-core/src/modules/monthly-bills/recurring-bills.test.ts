import { describe, expect, test } from 'bun:test';

import { formatDateOnlyIso } from './monthly-bills-date';
import { getRecurringBillDueDatesForPeriod } from './recurring-bills.service';

const baseRule = {
    id: 'rule-1',
    realmId: 'realm-1',
    name: 'Rent',
    qbVendorId: 'vendor-1',
    vendorName: 'Vendor',
    bankAccountId: 'bank-1',
    bankAccountName: 'Checking',
    categoryId: 'cat-1',
    categoryName: 'Rent',
    interval: 1,
    anchorDate: new Date(Date.UTC(2026, 0, 1)),
    scheduleTiming: 'DAY_OF_MONTH',
    dayOfMonth: 1,
    dayOfWeek: null,
    amountMode: 'FIXED',
    defaultAmount: 100,
    descriptionTemplate: null,
    memoTemplate: null,
    isActive: true,
    startsOn: null,
    endsOn: null,
} as const;

function isoDates(dates: Date[]) {
    return dates.map(formatDateOnlyIso);
}

describe('recurring bill schedule generation', () => {
    test('uses the real last day for end-of-month schedules', () => {
        const rule = {
            ...baseRule,
            frequency: 'MONTHLY',
            scheduleTiming: 'END_OF_MONTH',
            dayOfMonth: null,
        } as any;

        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 2))).toEqual(['2026-02-28']);
        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2028, 2))).toEqual(['2028-02-29']);
    });

    test('generates every matching weekday for weekly bills', () => {
        const rule = {
            ...baseRule,
            frequency: 'WEEKLY',
            scheduleTiming: 'DAY_OF_WEEK',
            dayOfMonth: null,
            dayOfWeek: 1,
        } as any;

        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 6))).toEqual([
            '2026-06-01',
            '2026-06-08',
            '2026-06-15',
            '2026-06-22',
            '2026-06-29',
        ]);
    });

    test('anchors biweekly schedules from the rule anchor date', () => {
        const rule = {
            ...baseRule,
            frequency: 'BIWEEKLY',
            scheduleTiming: 'DAY_OF_WEEK',
            anchorDate: new Date(Date.UTC(2026, 5, 3)),
            dayOfWeek: 3,
        } as any;

        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 6))).toEqual([
            '2026-06-03',
            '2026-06-17',
        ]);
    });

    test('uses the anchor month for custom monthly intervals', () => {
        const rule = {
            ...baseRule,
            frequency: 'CUSTOM_MONTHLY',
            interval: 3,
            anchorDate: new Date(Date.UTC(2026, 0, 10)),
            scheduleTiming: 'DAY_OF_MONTH',
            dayOfMonth: 10,
        } as any;

        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 1))).toEqual(['2026-01-10']);
        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 2))).toEqual([]);
        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 4))).toEqual(['2026-04-10']);
    });
    test('does not backfill weekly dates before the rule start date', () => {
        const rule = {
            ...baseRule,
            frequency: 'WEEKLY',
            scheduleTiming: 'DAY_OF_WEEK',
            dayOfMonth: null,
            dayOfWeek: 1,
            startsOn: new Date(Date.UTC(2026, 5, 15)),
        } as any;

        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 6))).toEqual([
            '2026-06-15',
            '2026-06-22',
            '2026-06-29',
        ]);
    });

    test('does not show a monthly occurrence before the rule start date', () => {
        const rule = {
            ...baseRule,
            frequency: 'MONTHLY',
            scheduleTiming: 'DAY_OF_MONTH',
            dayOfMonth: 1,
            startsOn: new Date(Date.UTC(2026, 5, 15)),
        } as any;

        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 6))).toEqual([]);
        expect(isoDates(getRecurringBillDueDatesForPeriod(rule, 2026, 7))).toEqual(['2026-07-01']);
    });
});
