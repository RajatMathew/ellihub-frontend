import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Decimal } from 'decimal.js';

type MockFn = ReturnType<typeof mock>;

const quickBooksServiceMock = {
    createVendorPurchase: mock(),
};

const prismaMock = {
    purchaseOrder: {
        findFirst: mock(),
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
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
};

const getPreviousPeriod = () => {
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { month: previous.getMonth() + 1, year: previous.getFullYear() };
};

beforeEach(() => {
    clearMock(quickBooksServiceMock.createVendorPurchase);
    clearMock(prismaMock.purchaseOrder.findFirst);
    clearMock(prismaMock.plannedPOPayment.findUnique);
    clearMock(prismaMock.plannedPOPayment.upsert);
    clearMock(prismaMock.project.count);
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
        expect(prismaMock.plannedPOPayment.upsert).not.toHaveBeenCalled();
    });
});
