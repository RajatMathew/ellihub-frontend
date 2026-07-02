import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Decimal } from 'decimal.js';

import {
    formatDateOnlyIso,
    formatMonthlyBillPeriodLabel,
    getMonthlyBillCurrentPeriod,
    getMonthlyBillDateOnlyBounds,
    getMonthlyBillDefaultTxnDate,
    getMonthlyBillInstantBounds,
    isCurrentMonthlyBillPeriod,
    isDateOnlyInMonthlyBillPeriod,
    parseDateOnlyToUtcDate,
} from './monthly-bills-date';

type MockFn = ReturnType<typeof mock>;

const quickBooksServiceMock = {
    createVendorPurchase: mock(),
};

const prismaMock = {
    $transaction: mock(),
    purchaseOrder: {
        findFirst: mock(),
        findMany: mock(),
    },
    plannedPOPayment: {
        findUnique: mock(),
        upsert: mock(),
    },
    project: {
        count: mock(),
    },
};

mock.module('@lib/prisma', () => ({
    prisma: prismaMock,
}));

mock.module('@modules/integrations/service', () => ({
    QuickBooksService: quickBooksServiceMock,
}));

const clearMock = (fn: MockFn) => fn.mockClear();

const getCurrentPeriod = () => {
    return getMonthlyBillCurrentPeriod();
};

const getPreviousPeriod = () => {
    const current = getCurrentPeriod();
    return current.month === 1
        ? { month: 12, year: current.year - 1 }
        : { month: current.month - 1, year: current.year };
};

beforeEach(() => {
    clearMock(prismaMock.$transaction);
    clearMock(quickBooksServiceMock.createVendorPurchase);
    clearMock(prismaMock.purchaseOrder.findFirst);
    clearMock(prismaMock.purchaseOrder.findMany);
    clearMock(prismaMock.plannedPOPayment.findUnique);
    clearMock(prismaMock.plannedPOPayment.upsert);
    clearMock(prismaMock.project.count);
});

describe('monthly bill date helpers', () => {
    test('uses America/New_York for current monthly bill period', () => {
        const beforeNewYorkMidnight = new Date('2026-07-01T03:30:00.000Z');
        const atNewYorkMidnight = new Date('2026-07-01T04:00:00.000Z');

        expect(isCurrentMonthlyBillPeriod(6, 2026, beforeNewYorkMidnight)).toBe(true);
        expect(isCurrentMonthlyBillPeriod(7, 2026, beforeNewYorkMidnight)).toBe(false);
        expect(isCurrentMonthlyBillPeriod(7, 2026, atNewYorkMidnight)).toBe(true);
    });

    test('keeps payment dates as date-only values for monthly filters', () => {
        const juneFirst = parseDateOnlyToUtcDate('2026-06-01');
        const juneLast = parseDateOnlyToUtcDate('2026-06-30');
        const julyFirst = parseDateOnlyToUtcDate('2026-07-01');
        const bounds = getMonthlyBillDateOnlyBounds(2026, 6);

        expect(juneFirst).not.toBeNull();
        expect(juneLast).not.toBeNull();
        expect(julyFirst).not.toBeNull();
        expect(formatDateOnlyIso(bounds.startDate)).toBe('2026-06-01');
        expect(formatDateOnlyIso(bounds.endDate)).toBe('2026-06-30');
        expect(isDateOnlyInMonthlyBillPeriod(juneFirst!, 6, 2026)).toBe(true);
        expect(isDateOnlyInMonthlyBillPeriod(juneLast!, 6, 2026)).toBe(true);
        expect(isDateOnlyInMonthlyBillPeriod(julyFirst!, 6, 2026)).toBe(false);
    });

    test('builds New York instant bounds for timestamp fields', () => {
        const june = getMonthlyBillInstantBounds(2026, 6);
        const november = getMonthlyBillInstantBounds(2026, 11);

        expect(june.startOfPeriod.toISOString()).toBe('2026-06-01T04:00:00.000Z');
        expect(june.nextPeriodStart.toISOString()).toBe('2026-07-01T04:00:00.000Z');
        expect(november.startOfPeriod.toISOString()).toBe('2026-11-01T04:00:00.000Z');
        expect(november.nextPeriodStart.toISOString()).toBe('2026-12-01T05:00:00.000Z');
    });

    test('builds list response period metadata from backend calendar rules', () => {
        const inPeriod = new Date('2026-06-15T12:00:00.000Z');
        const afterPeriod = new Date('2026-07-01T04:00:00.000Z');

        expect(formatMonthlyBillPeriodLabel(2026, 6)).toBe('June 2026');
        expect(getMonthlyBillDefaultTxnDate(2026, 6, inPeriod)).toBe('2026-06-15');
        expect(getMonthlyBillDefaultTxnDate(2026, 6, afterPeriod)).toBe('2026-06-01');
    });
});

describe('MonthlyBillsService current-month mutations', () => {
    test('allows planned payment updates for the current month', async () => {
        const { MonthlyBillsService } = await import('./service.js');
        const period = getCurrentPeriod();
        const plannedPayment = {
            id: 'planned-1',
            purchaseOrderId: 'po-1',
            month: period.month,
            year: period.year,
            amount: new Decimal(500),
            isReady: true,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        };

        prismaMock.purchaseOrder.findFirst.mockResolvedValueOnce({
            id: 'po-1',
            projectId: 'project-1',
            total: new Decimal(1000),
            poPayments: [],
            subChangeOrders: [],
        });
        prismaMock.plannedPOPayment.upsert.mockResolvedValueOnce(plannedPayment);

        await expect(
            MonthlyBillsService.upsertPlannedPayment({
                purchaseOrderId: 'po-1',
                month: period.month,
                year: period.year,
                amount: 500,
                isReady: true,
                userRole: 'admin',
                employeeId: null,
            })
        ).resolves.toBe(plannedPayment);

        expect(prismaMock.plannedPOPayment.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    purchaseOrderId_month_year: {
                        purchaseOrderId: 'po-1',
                        month: period.month,
                        year: period.year,
                    },
                },
            })
        );
    });

    test('rejects planned payment updates outside the current month before reading the PO', async () => {
        const { MonthlyBillsService } = await import('./service.js');
        const period = getPreviousPeriod();

        await expect(
            MonthlyBillsService.upsertPlannedPayment({
                purchaseOrderId: 'po-1',
                month: period.month,
                year: period.year,
                amount: 500,
                isReady: true,
                userRole: 'admin',
                employeeId: null,
            })
        ).rejects.toThrow(
            'Monthly bill payments can only be edited or paid for the current month.'
        );

        expect(prismaMock.purchaseOrder.findFirst).not.toHaveBeenCalled();
        expect(prismaMock.plannedPOPayment.upsert).not.toHaveBeenCalled();
    });

    test('rejects marking payments outside the current month before calling QuickBooks', async () => {
        const { MonthlyBillsService } = await import('./service.js');
        const period = getPreviousPeriod();

        await expect(
            MonthlyBillsService.markPayment({
                purchaseOrderId: 'po-1',
                month: period.month,
                year: period.year,
                txnDate: `${period.year}-${String(period.month).padStart(2, '0')}-01`,
                description: 'PO#1001 - Partial Payment 1',
                memo: '',
                qbVendorId: 'qb-vendor-1',
                bankAccountId: 'qb-bank-1',
                categoryId: 'qb-category-1',
                userRole: 'admin',
            })
        ).rejects.toThrow(
            'Monthly bill payments can only be edited or paid for the current month.'
        );

        expect(prismaMock.plannedPOPayment.findUnique).not.toHaveBeenCalled();
        expect(quickBooksServiceMock.createVendorPurchase).not.toHaveBeenCalled();
    });

    test('rejects payment dates outside the current monthly bill period before calling QuickBooks', async () => {
        const { MonthlyBillsService } = await import('./service.js');
        const period = getCurrentPeriod();
        const previous = getPreviousPeriod();

        prismaMock.plannedPOPayment.findUnique.mockResolvedValueOnce({
            id: 'planned-1',
            purchaseOrderId: 'po-1',
            month: period.month,
            year: period.year,
            amount: new Decimal(500),
            isReady: true,
            purchaseOrder: {
                vendorId: 'vendor-1',
                total: new Decimal(1000),
                poPayments: [],
                subChangeOrders: [],
            },
        });

        await expect(
            MonthlyBillsService.markPayment({
                purchaseOrderId: 'po-1',
                month: period.month,
                year: period.year,
                txnDate: `${previous.year}-${String(previous.month).padStart(2, '0')}-01`,
                description: 'PO#1001 - Partial Payment 1',
                memo: '',
                qbVendorId: 'qb-vendor-1',
                bankAccountId: 'qb-bank-1',
                categoryId: 'qb-category-1',
                userRole: 'admin',
            })
        ).rejects.toThrow('Payment date must be within the selected monthly bill period.');

        expect(quickBooksServiceMock.createVendorPurchase).not.toHaveBeenCalled();
    });

    test('forwards print-later preference when marking a payment', async () => {
        const { MonthlyBillsService } = await import('./service.js');
        const period = getCurrentPeriod();
        const txnDate = getMonthlyBillDefaultTxnDate(period.year, period.month);
        const plannedAmount = new Decimal(500);
        const payment = {
            id: 'payment-1',
            purchaseOrderId: 'po-1',
            amount: plannedAmount,
            qbVendorId: 'qb-vendor-1',
            bankAccountId: 'qb-bank-1',
            txnDate: parseDateOnlyToUtcDate(txnDate)!,
            transactionId: 'purchase-1',
            transactionUrl: 'https://app.sandbox.qbo.intuit.com/app/check?txnId=purchase-1',
            quickBooksResponse: { Purchase: { Id: 'purchase-1', SyncToken: '0' } },
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        };
        const tx = {
            poPayment: {
                create: mock(() => Promise.resolve(payment)),
                aggregate: mock(() => Promise.resolve({ _sum: { amount: plannedAmount } })),
            },
            plannedPOPayment: {
                update: mock(() => Promise.resolve({ id: 'planned-1' })),
            },
            purchaseOrder: {
                update: mock(() => Promise.resolve({ id: 'po-1' })),
            },
        };

        prismaMock.plannedPOPayment.findUnique.mockResolvedValueOnce({
            id: 'planned-1',
            purchaseOrderId: 'po-1',
            month: period.month,
            year: period.year,
            amount: plannedAmount,
            isReady: true,
            purchaseOrder: {
                vendorId: 'vendor-1',
                total: new Decimal(1000),
                poPayments: [],
                subChangeOrders: [],
            },
        });
        quickBooksServiceMock.createVendorPurchase.mockResolvedValueOnce({
            transactionId: 'purchase-1',
            transactionUrl: 'https://app.sandbox.qbo.intuit.com/app/check?txnId=purchase-1',
            quickBooksResponse: { Purchase: { Id: 'purchase-1', SyncToken: '0' } },
        });
        prismaMock.$transaction.mockImplementationOnce((callback) => callback(tx));

        await expect(
            MonthlyBillsService.markPayment({
                purchaseOrderId: 'po-1',
                month: period.month,
                year: period.year,
                txnDate,
                description: 'PO#1001 - Partial Payment 1',
                memo: '',
                qbVendorId: 'qb-vendor-1',
                bankAccountId: 'qb-bank-1',
                categoryId: 'qb-category-1',
                printLater: true,
                userRole: 'admin',
            })
        ).resolves.toEqual(payment);

        expect(quickBooksServiceMock.createVendorPurchase).toHaveBeenCalledWith(
            expect.objectContaining({
                qbVendorId: 'qb-vendor-1',
                bankAccountId: 'qb-bank-1',
                categoryId: 'qb-category-1',
                printLater: true,
            })
        );
        expect(tx.purchaseOrder.update).not.toHaveBeenCalled();
    });

    test('rejects mixed-period bulk updates before saving any planned payment', async () => {
        const { MonthlyBillsService } = await import('./service.js');
        const current = getCurrentPeriod();
        const previous = getPreviousPeriod();

        await expect(
            MonthlyBillsService.bulkUpsertPlannedPayments({
                items: [
                    {
                        purchaseOrderId: 'po-current',
                        month: current.month,
                        year: current.year,
                        amount: 500,
                        isReady: true,
                    },
                    {
                        purchaseOrderId: 'po-previous',
                        month: previous.month,
                        year: previous.year,
                        amount: 500,
                        isReady: true,
                    },
                ],
                userRole: 'admin',
                employeeId: null,
            })
        ).rejects.toThrow(
            'Monthly bill payments can only be edited or paid for the current month.'
        );

        expect(prismaMock.purchaseOrder.findFirst).not.toHaveBeenCalled();
        expect(prismaMock.purchaseOrder.findMany).not.toHaveBeenCalled();
        expect(prismaMock.plannedPOPayment.upsert).not.toHaveBeenCalled();
    });

    test('bulk updates planned payments with one PO read and one transaction', async () => {
        const { MonthlyBillsService } = await import('./service.js');
        const period = getCurrentPeriod();
        const plannedOne = {
            id: 'planned-1',
            purchaseOrderId: 'po-1',
            month: period.month,
            year: period.year,
            amount: new Decimal(250),
            isReady: true,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        };
        const plannedTwo = {
            id: 'planned-2',
            purchaseOrderId: 'po-2',
            month: period.month,
            year: period.year,
            amount: new Decimal(300),
            isReady: false,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        };

        prismaMock.purchaseOrder.findMany.mockResolvedValueOnce([
            {
                id: 'po-1',
                projectId: 'project-1',
                total: new Decimal(1000),
                poPayments: [],
                subChangeOrders: [],
            },
            {
                id: 'po-2',
                projectId: 'project-1',
                total: new Decimal(1000),
                poPayments: [],
                subChangeOrders: [],
            },
        ]);
        prismaMock.plannedPOPayment.upsert
            .mockReturnValueOnce(Promise.resolve(plannedOne))
            .mockReturnValueOnce(Promise.resolve(plannedTwo));
        prismaMock.$transaction.mockImplementationOnce((operations: Promise<unknown>[]) =>
            Promise.all(operations)
        );

        await expect(
            MonthlyBillsService.bulkUpsertPlannedPayments({
                items: [
                    {
                        purchaseOrderId: 'po-1',
                        month: period.month,
                        year: period.year,
                        amount: 250,
                        isReady: true,
                    },
                    {
                        purchaseOrderId: 'po-2',
                        month: period.month,
                        year: period.year,
                        amount: 300,
                        isReady: false,
                    },
                ],
                userRole: 'admin',
                employeeId: null,
            })
        ).resolves.toEqual([plannedOne, plannedTwo]);

        expect(prismaMock.purchaseOrder.findMany).toHaveBeenCalledTimes(1);
        expect(prismaMock.plannedPOPayment.upsert).toHaveBeenCalledTimes(2);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
});
