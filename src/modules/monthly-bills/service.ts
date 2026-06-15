import { Prisma } from '@db/browser';
import { prisma } from '@lib/prisma';
import { calculateSubChangeOrderTotalAmount } from '@modules/commercial-document/totals';
import { QuickBooksService } from '@modules/integrations/service';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '@utils/error';
import { generateNanoId } from '@utils/generateNanoId';
import { parseISO } from 'date-fns';
import { Decimal } from 'decimal.js';

import type {
    BulkUpsertPlannedPaymentsInput,
    MarkPaymentInput,
    MonthlyBillItem,
    MonthlyBillProjectGroup,
    MonthlyBillsQuery,
    UpsertPlannedPaymentInput,
} from './models';

type DecimalValue = ConstructorParameters<typeof Decimal>[0];

function canManageAllMonthlyBills(userRole: MonthlyBillsQuery['userRole']): boolean {
    return userRole === 'dev' || userRole === 'admin' || userRole === 'accountant';
}

function buildProjectManagerWhere(employeeId: string): Prisma.ProjectWhereInput {
    return {
        OR: [
            { leadPMId: employeeId },
            {
                teamMembers: {
                    some: {
                        employeeId,
                        OR: [{ isLead: true }, { role: { in: ['Lead PM', 'PM'] } }],
                    },
                },
            },
        ],
    };
}

function sumDecimals(items: { amount: DecimalValue }[]): Decimal {
    return items.reduce((sum, item) => sum.add(item.amount), new Decimal(0));
}

function toDecimal(value: DecimalValue | null | undefined): Decimal {
    return new Decimal(value ?? 0);
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isCurrentMonthlyBillPeriod(month: number, year: number, now = new Date()): boolean {
    return month === now.getMonth() + 1 && year === now.getFullYear();
}

function assertCurrentMonthlyBillPeriod(month: number, year: number) {
    if (isCurrentMonthlyBillPeriod(month, year)) return;

    throw new BadRequestError(
        'Monthly bill payments can only be edited or paid for the current month.'
    );
}

function parseDateOnly(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new BadRequestError('Payment date is invalid.');

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        throw new BadRequestError('Payment date is invalid.');
    }

    return date;
}

function assertPaymentDateInPeriod(txnDate: Date, month: number, year: number) {
    if (txnDate.getUTCFullYear() === year && txnDate.getUTCMonth() + 1 === month) return;

    throw new BadRequestError('Payment date must be within the selected monthly bill period.');
}

function getBillTotal(purchaseOrder: {
    total: DecimalValue;
    subChangeOrders: {
        amount: DecimalValue;
        negotiatedDiscount?: DecimalValue | null;
        shippingHandlingFee?: DecimalValue | null;
        taxPercent?: DecimalValue | null;
        taxAmount?: DecimalValue | null;
    }[];
}): Decimal {
    const scoSum = purchaseOrder.subChangeOrders.reduce<Decimal>(
        (sum, sco) => sum.add(calculateSubChangeOrderTotalAmount(sco as any)),
        new Decimal(0)
    );
    return new Decimal(purchaseOrder.total).add(scoSum);
}

function getBillBalance(purchaseOrder: {
    total: DecimalValue;
    subChangeOrders: {
        amount: DecimalValue;
        negotiatedDiscount?: DecimalValue | null;
        shippingHandlingFee?: DecimalValue | null;
        taxPercent?: DecimalValue | null;
        taxAmount?: DecimalValue | null;
    }[];
    poPayments: { amount: DecimalValue }[];
}): Decimal {
    return getBillTotal(purchaseOrder).sub(sumDecimals(purchaseOrder.poPayments));
}

/** Restrict the result set to open POs or POs paid inside the selected period. */
function buildBillsWhere(query: MonthlyBillsQuery): Prisma.PurchaseOrderWhereInput {
    const periodStart = parseISO(query.startDate);
    const periodEnd = parseISO(query.endDate);
    const filters: Prisma.PurchaseOrderWhereInput[] = [
        { issuedAt: { lte: periodEnd } },
        {
            OR: [
                { fullyPaid: false },
                {
                    poPayments: {
                        some: {
                            txnDate: {
                                gte: periodStart,
                                lte: periodEnd,
                            },
                        },
                    },
                },
            ],
        },
    ];

    if (query.search) {
        filters.push({
            OR: [
                { poNumber: { contains: query.search, mode: 'insensitive' } },
                { vendor: { name: { contains: query.search, mode: 'insensitive' } } },
                { project: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
        });
    }

    const where: Prisma.PurchaseOrderWhereInput = { AND: filters };

    if (query.vendorId?.length) {
        where.vendorId = { in: query.vendorId };
    }

    if (query.tradeCategoryId?.length) {
        where.tradeCategoryId = { in: query.tradeCategoryId };
    }

    if (canManageAllMonthlyBills(query.userRole)) {
        return where;
    }

    if (query.userRole === 'pm') {
        if (!query.employeeId) {
            throw new UnauthorizedError('No employee profile is linked to your account.');
        }
        return {
            ...where,
            project: buildProjectManagerWhere(query.employeeId),
        };
    }

    throw new UnauthorizedError('You are not allowed to access this data.');
}

export const MonthlyBillsService = {
    async listMonthlyBills(query: MonthlyBillsQuery): Promise<MonthlyBillProjectGroup[]> {
        const periodStart = parseISO(query.startDate);
        const periodEnd = parseISO(query.endDate);
        const [activeQuickBooksConnection, purchaseOrders] = await prisma.$transaction([
            prisma.quickBooksConnection.findFirst({
                where: { status: 'CONNECTED', disconnectedAt: null },
                orderBy: { updatedAt: 'desc' },
                select: { realmId: true },
            }),
            prisma.purchaseOrder.findMany({
                where: buildBillsWhere(query),
                select: {
                    id: true,
                    poNumber: true,
                    issuedAt: true,
                    total: true,
                    vendor: { select: { id: true, name: true, email: true, phone: true } },
                    project: { select: { id: true, name: true, jobNumber: true } },
                    poPayments: {
                        where: {
                            txnDate: {
                                gte: periodStart,
                                lte: periodEnd,
                            },
                        },
                        select: {
                            id: true,
                            txnDate: true,
                            transactionId: true,
                            transactionUrl: true,
                            amount: true,
                        },
                        orderBy: { txnDate: 'desc' },
                    },
                    plannedPayments: {
                        where: { month: query.month, year: query.year },
                        select: { amount: true, isReady: true },
                        take: 1,
                    },
                },
            }),
        ]);

        const purchaseOrderIds = purchaseOrders.map((po) => po.id);
        const vendorIds = Array.from(new Set(purchaseOrders.map((po) => po.vendor.id)));
        const [paymentTotals, subChangeOrders] =
            purchaseOrderIds.length > 0
                ? await prisma.$transaction([
                      prisma.poPayment.groupBy({
                          by: ['purchaseOrderId'],
                          orderBy: { purchaseOrderId: 'asc' },
                          where: { purchaseOrderId: { in: purchaseOrderIds } },
                          _sum: { amount: true },
                      }),
                      prisma.subChangeOrder.findMany({
                          where: {
                              purchaseOrderId: { in: purchaseOrderIds },
                              status: 'APPROVED',
                              deletedAt: null,
                          },
                          select: {
                              purchaseOrderId: true,
                              amount: true,
                              negotiatedDiscount: true,
                              shippingHandlingFee: true,
                              taxPercent: true,
                              taxAmount: true,
                          },
                      }),
                  ])
                : [[], []];
        const quickBooksVendorMappings =
            activeQuickBooksConnection && vendorIds.length > 0
                ? await prisma.quickBooksVendorMapping.findMany({
                      where: {
                          realmId: activeQuickBooksConnection.realmId,
                          vendorId: { in: vendorIds },
                      },
                      include: {
                          quickBooksPayee: {
                              select: {
                                  displayName: true,
                                  companyName: true,
                                  primaryEmail: true,
                                  primaryPhone: true,
                              },
                          },
                      },
                  })
                : [];

        const totalPaidByPurchaseOrderId = new Map(
            paymentTotals.map((total) => [total.purchaseOrderId, toDecimal(total._sum?.amount)])
        );
        const scosByPurchaseOrderId = new Map<string, typeof subChangeOrders>();
        for (const sco of subChangeOrders) {
            const list = scosByPurchaseOrderId.get(sco.purchaseOrderId) ?? [];
            list.push(sco);
            scosByPurchaseOrderId.set(sco.purchaseOrderId, list);
        }
        const quickBooksMappingByVendorId = new Map(
            quickBooksVendorMappings.map((mapping) => [
                mapping.vendorId,
                {
                    id: mapping.id,
                    vendorId: mapping.vendorId,
                    realmId: mapping.realmId,
                    quickBooksPayeeId: mapping.quickBooksPayeeId,
                    qbVendorId: mapping.quickBooksId,
                    displayName: mapping.quickBooksPayee.displayName,
                    companyName: mapping.quickBooksPayee.companyName,
                    primaryEmail: mapping.quickBooksPayee.primaryEmail,
                    primaryPhone: mapping.quickBooksPayee.primaryPhone,
                },
            ])
        );
        const groups = new Map<string, MonthlyBillProjectGroup>();

        for (const po of purchaseOrders) {
            const totalPaid = totalPaidByPurchaseOrderId.get(po.id) ?? new Decimal(0);
            const poScos = scosByPurchaseOrderId.get(po.id) ?? [];
            const subChangeOrdersCount = poScos.length;
            const subChangeOrdersTotal = poScos.reduce<Decimal>(
                (sum, sco) => sum.add(calculateSubChangeOrderTotalAmount(sco)),
                new Decimal(0)
            );
            const poTotal = new Decimal(po.total);
            const original = poTotal.add(subChangeOrdersTotal);

            const plannedPayment = po.plannedPayments[0];
            const normalizedPlannedPayment = plannedPayment
                ? {
                      ...plannedPayment,
                      isReady:
                          new Decimal(plannedPayment.amount).greaterThan(0) &&
                          plannedPayment.isReady,
                  }
                : null;

            const bill: MonthlyBillItem = {
                purchaseOrder: {
                    id: po.id,
                    poNumber: po.poNumber,
                    vendor: {
                        ...po.vendor,
                        quickBooksMapping: quickBooksMappingByVendorId.get(po.vendor.id) ?? null,
                    },
                    issuedAt: po.issuedAt,
                    subChangeOrdersCount,
                    subChangeOrders: [],
                },
                poTotal,
                scoTotal: subChangeOrdersTotal,
                original,
                totalPaid,
                balance: original.minus(totalPaid),
                plannedPayment: normalizedPlannedPayment,
                payments: po.poPayments,
            };

            const group = groups.get(po.project.id) ?? { project: po.project, bills: [] };
            group.bills.push(bill);
            groups.set(po.project.id, group);
        }

        return Array.from(groups.values());
    },

    async listPurchaseOrderSubChangeOrders(
        purchaseOrderId: string,
        query: Pick<MonthlyBillsQuery, 'userRole' | 'employeeId'>
    ) {
        const scopedWhere: Prisma.PurchaseOrderWhereInput = {
            id: purchaseOrderId,
            deletedAt: null,
        };

        if (!canManageAllMonthlyBills(query.userRole)) {
            if (query.userRole !== 'pm' || !query.employeeId) {
                throw new ForbiddenError('You are not allowed to access this data.');
            }
            scopedWhere.project = buildProjectManagerWhere(query.employeeId);
        }

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: scopedWhere,
            select: { id: true },
        });
        if (!purchaseOrder) {
            throw new NotFoundError('Purchase order not found.');
        }

        return prisma.subChangeOrder.findMany({
            where: {
                purchaseOrderId,
                status: 'APPROVED',
                deletedAt: null,
            },
            select: {
                id: true,
                scoNumber: true,
                amount: true,
            },
            orderBy: { scoNumber: 'asc' },
        });
    },

    /** Create or update the planned payment for a (purchaseOrder, month, year) combo. */
    async upsertPlannedPayment(request: UpsertPlannedPaymentInput) {
        assertCurrentMonthlyBillPeriod(request.month, request.year);

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: { id: request.purchaseOrderId, deletedAt: null },
            select: {
                id: true,
                projectId: true,
                total: true,
                poPayments: { select: { amount: true } },
                subChangeOrders: {
                    where: { status: 'APPROVED', deletedAt: null },
                    select: {
                        amount: true,
                        negotiatedDiscount: true,
                        shippingHandlingFee: true,
                        taxPercent: true,
                        taxAmount: true,
                    },
                },
            },
        });
        if (!purchaseOrder) {
            throw new NotFoundError('Purchase order not found.');
        }

        if (!canManageAllMonthlyBills(request.userRole)) {
            if (request.userRole !== 'pm' || !request.employeeId) {
                throw new ForbiddenError('You are not allowed to update planned payments.');
            }

            const projectCount = await prisma.project.count({
                where: {
                    id: purchaseOrder.projectId,
                    deletedAt: null,
                    ...buildProjectManagerWhere(request.employeeId),
                },
            });
            if (projectCount < 1) {
                throw new ForbiddenError('You can only update bills for your projects.');
            }
        }

        const amount = new Decimal(request.amount);
        const balance = getBillBalance(purchaseOrder);
        if (amount.greaterThan(balance)) {
            throw new BadRequestError('Planned payment cannot exceed the remaining bill balance.');
        }
        const nextReady = amount.greaterThan(0) ? request.isReady : false;

        return prisma.plannedPOPayment.upsert({
            where: {
                purchaseOrderId_month_year: {
                    purchaseOrderId: request.purchaseOrderId,
                    month: request.month,
                    year: request.year,
                },
            },
            update: {
                amount,
                ...(nextReady !== undefined && { isReady: nextReady }),
            },
            create: {
                id: generateNanoId(),
                purchaseOrderId: request.purchaseOrderId,
                month: request.month,
                year: request.year,
                amount,
                isReady: nextReady ?? false,
            },
        });
    },

    async bulkUpsertPlannedPayments(request: BulkUpsertPlannedPaymentsInput) {
        for (const item of request.items) {
            assertCurrentMonthlyBillPeriod(item.month, item.year);
        }

        const results = [];

        for (const item of request.items) {
            results.push(
                await MonthlyBillsService.upsertPlannedPayment({
                    ...item,
                    userRole: request.userRole,
                    employeeId: request.employeeId,
                })
            );
        }

        return results;
    },

    /**
     * Record a ready planned payment as an actual payment in QuickBooks and
     * persist the resulting PoPayment. Restricted to admins and accountants.
     */
    async markPayment(request: MarkPaymentInput) {
        if (!canManageAllMonthlyBills(request.userRole)) {
            throw new ForbiddenError('Only admins and accountants can mark payments.');
        }
        assertCurrentMonthlyBillPeriod(request.month, request.year);

        const planned = await prisma.plannedPOPayment.findUnique({
            where: {
                purchaseOrderId_month_year: {
                    purchaseOrderId: request.purchaseOrderId,
                    month: request.month,
                    year: request.year,
                },
            },
            include: {
                purchaseOrder: {
                    select: {
                        vendorId: true,
                        total: true,
                        poPayments: { select: { amount: true } },
                        subChangeOrders: {
                            where: { status: 'APPROVED', deletedAt: null },
                            select: {
                                amount: true,
                                negotiatedDiscount: true,
                                shippingHandlingFee: true,
                                taxPercent: true,
                                taxAmount: true,
                            },
                        },
                    },
                },
            },
        });

        if (!planned) {
            throw new NotFoundError('Planned payment not found.');
        }
        if (!planned.isReady) {
            throw new BadRequestError('Planned payment is not marked ready.');
        }
        if (planned.amount.lessThanOrEqualTo(0)) {
            throw new BadRequestError('Planned payment amount must be greater than zero.');
        }

        const billTotal = getBillTotal(planned.purchaseOrder);
        const remaining = getBillBalance(planned.purchaseOrder);

        if (planned.amount.greaterThan(remaining)) {
            throw new BadRequestError('Payment amount exceeds the remaining balance.');
        }

        let preparedVendorMapping: Awaited<
            ReturnType<typeof QuickBooksService.prepareVendorMapping>
        > | null = null;
        let vendorMappingUserId: string | null = null;
        if (request.saveVendorMapping) {
            if (!request.userId) {
                throw new BadRequestError('User is required to save a QuickBooks vendor mapping.');
            }
            vendorMappingUserId = request.userId;
            preparedVendorMapping = await QuickBooksService.prepareVendorMapping({
                vendorId: planned.purchaseOrder.vendorId,
                qbVendorId: request.qbVendorId,
            });
        }
        const txnDate = parseDateOnly(request.txnDate);
        assertPaymentDateInPeriod(txnDate, request.month, request.year);

        const { transactionId, transactionUrl, quickBooksResponse } =
            await QuickBooksService.createVendorPurchase({
                qbVendorId: request.qbVendorId,
                bankAccountId: request.bankAccountId,
                categoryId: request.categoryId,
                amount: planned.amount.toNumber(),
                txnDate,
                lineDescription: request.description,
                memo: request.memo || undefined,
            });

        // QuickBooks succeeded: persist the payment, clear the ready flag so the same
        // planned payment can't be charged twice, and close out the PO once its
        // cumulative payments meet or exceed the PO total in one transaction.
        const poPayment = await prisma.$transaction(async (tx) => {
            const payment = await tx.poPayment.create({
                data: {
                    id: generateNanoId(),
                    purchaseOrderId: request.purchaseOrderId,
                    amount: planned.amount,
                    qbVendorId: request.qbVendorId,
                    bankAccountId: request.bankAccountId,
                    txnDate,
                    transactionId,
                    transactionUrl,
                    quickBooksResponse: toJsonValue(quickBooksResponse),
                },
            });

            if (preparedVendorMapping && vendorMappingUserId) {
                await QuickBooksService.savePreparedVendorMapping({
                    prepared: preparedVendorMapping,
                    userId: vendorMappingUserId,
                    tx,
                });
            }

            await tx.plannedPOPayment.update({
                where: { id: planned.id },
                data: { isReady: false, amount: new Decimal(0) },
            });

            const { _sum } = await tx.poPayment.aggregate({
                where: { purchaseOrderId: request.purchaseOrderId },
                _sum: { amount: true },
            });
            const totalPaid = new Decimal(_sum.amount ?? 0);

            if (totalPaid.greaterThanOrEqualTo(billTotal)) {
                await tx.purchaseOrder.update({
                    where: { id: request.purchaseOrderId },
                    data: { fullyPaid: true },
                });
            }

            return payment;
        });

        return poPayment;
    },
};
