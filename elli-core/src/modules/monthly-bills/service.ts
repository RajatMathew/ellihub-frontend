import { Prisma } from '@db/browser';
import { prisma } from '@lib/prisma';
import { calculateSubChangeOrderTotalAmount } from '@modules/commercial-document/totals';
import { QuickBooksService } from '@modules/integrations/service';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '@utils/error';
import { generateNanoId } from '@utils/generateNanoId';
import { Decimal } from 'decimal.js';

import {
    formatDateOnlyDisplay,
    formatMonthlyBillPeriodLabel,
    formatMonthlyBillTimestamp,
    getMonthlyBillDateOnlyBounds,
    getMonthlyBillDateOnlyBoundsIso,
    getMonthlyBillDefaultTxnDate,
    getMonthlyBillInstantBounds,
    isCurrentMonthlyBillPeriod,
    isDateOnlyInMonthlyBillPeriod,
    parseDateOnlyToUtcDate,
} from './monthly-bills-date';

import type {
    BulkUpsertPlannedPaymentsInput,
    MarkPaymentInput,
    MonthlyBillItem,
    MonthlyBillProjectGroup,
    MonthlyBillsPagination,
    MonthlyBillsQuery,
    MonthlyBillsResponse,
    UpsertPlannedPaymentInput,
} from './models';

type DecimalValue = ConstructorParameters<typeof Decimal>[0];

function canManageAllMonthlyBills(userRole: MonthlyBillsQuery['userRole']): boolean {
    return (
        userRole === 'dev' || userRole === 'admin' || userRole === 'accountant' || userRole === 'ap'
    );
}

function canUpdateListedMonthlyBills(query: MonthlyBillsQuery, isCurrentPeriod: boolean): boolean {
    return (
        isCurrentPeriod &&
        query.canUpdateMonthlyBills &&
        (canManageAllMonthlyBills(query.userRole) || query.userRole === 'pm')
    );
}

function canMarkListedMonthlyBills(query: MonthlyBillsQuery, isCurrentPeriod: boolean): boolean {
    return isCurrentPeriod && query.canMarkMonthlyBills && canManageAllMonthlyBills(query.userRole);
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

function assertCurrentMonthlyBillPeriod(month: number, year: number) {
    if (isCurrentMonthlyBillPeriod(month, year)) return;

    throw new BadRequestError(
        'Monthly bill payments can only be edited or paid for the current month.'
    );
}

function parseDateOnly(value: string): Date {
    const date = parseDateOnlyToUtcDate(value);
    if (!date) throw new BadRequestError('Payment date is invalid.');
    return date;
}

function assertPaymentDateInPeriod(txnDate: Date, month: number, year: number) {
    if (isDateOnlyInMonthlyBillPeriod(txnDate, month, year)) return;

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

function sortMonthlyBillProjects(
    projects: MonthlyBillProjectGroup['project'][]
): MonthlyBillProjectGroup['project'][] {
    return [...projects].sort((left, right) => {
        const leftJob = left.jobNumber ?? '';
        const rightJob = right.jobNumber ?? '';
        const jobCompare = leftJob.localeCompare(rightJob, undefined, {
            numeric: true,
            sensitivity: 'base',
        });
        if (jobCompare !== 0) return jobCompare;

        const nameCompare = left.name.localeCompare(right.name, undefined, {
            numeric: true,
            sensitivity: 'base',
        });
        if (nameCompare !== 0) return nameCompare;

        return left.id.localeCompare(right.id);
    });
}

function buildMonthlyBillsPagination(
    query: Pick<MonthlyBillsQuery, 'page' | 'size'>,
    totalItems: number
): MonthlyBillsPagination {
    const totalPages = Math.max(1, Math.ceil(totalItems / query.size));

    return {
        currentPage: query.page,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
        totalItems,
        itemsPerPage: query.size,
    };
}

function summarizeMonthlyBills(
    purchaseOrders: {
        id: string;
        total: DecimalValue;
        project: MonthlyBillProjectGroup['project'];
        plannedPayments: { amount: DecimalValue; isReady: boolean }[];
    }[],
    totalPaidByPurchaseOrderId: Map<string, Decimal>,
    paidThisMonthByPurchaseOrderId: Map<string, Decimal>,
    scosByPurchaseOrderId: Map<
        string,
        {
            amount: DecimalValue;
            negotiatedDiscount?: DecimalValue | null;
            shippingHandlingFee?: DecimalValue | null;
            taxPercent?: DecimalValue | null;
            taxAmount?: DecimalValue | null;
        }[]
    >
): MonthlyBillsResponse['meta']['summary'] {
    const projectIds = new Set<string>();

    return purchaseOrders.reduce<MonthlyBillsResponse['meta']['summary']>(
        (summary, po) => {
            projectIds.add(po.project.id);
            const totalPaid = totalPaidByPurchaseOrderId.get(po.id) ?? new Decimal(0);
            const poScos = scosByPurchaseOrderId.get(po.id) ?? [];
            const original = new Decimal(po.total).add(
                poScos.reduce<Decimal>(
                    (sum, sco) => sum.add(calculateSubChangeOrderTotalAmount(sco as any)),
                    new Decimal(0)
                )
            );
            const plannedPayment = po.plannedPayments[0];
            const plannedAmount = toDecimal(plannedPayment?.amount);
            const isReady = plannedAmount.greaterThan(0) && (plannedPayment?.isReady ?? false);

            return {
                projectCount: projectIds.size,
                billCount: summary.billCount + 1,
                balance: summary.balance.add(original.minus(totalPaid)),
                planned: summary.planned.add(plannedAmount),
                paidThisMonth: summary.paidThisMonth.add(
                    paidThisMonthByPurchaseOrderId.get(po.id) ?? new Decimal(0)
                ),
                readyCount: summary.readyCount + (isReady ? 1 : 0),
            };
        },
        {
            projectCount: 0,
            billCount: 0,
            balance: new Decimal(0),
            planned: new Decimal(0),
            paidThisMonth: new Decimal(0),
            readyCount: 0,
        }
    );
}

/** Restrict the result set to open POs or POs paid inside the selected period. */
function buildBillsWhere(
    query: MonthlyBillsQuery,
    nextPeriodStart: Date,
    paymentStartDate: Date,
    paymentEndDate: Date
): Prisma.PurchaseOrderWhereInput {
    const filters: Prisma.PurchaseOrderWhereInput[] = [
        { issuedAt: { lt: nextPeriodStart } },
        {
            OR: [
                { fullyPaid: false },
                {
                    poPayments: {
                        some: {
                            txnDate: {
                                gte: paymentStartDate,
                                lte: paymentEndDate,
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
    async listMonthlyBills(query: MonthlyBillsQuery): Promise<MonthlyBillsResponse> {
        const { nextPeriodStart } = getMonthlyBillInstantBounds(query.year, query.month);
        const { startDate, endDate } = getMonthlyBillDateOnlyBounds(query.year, query.month);
        const isCurrentPeriod = isCurrentMonthlyBillPeriod(query.month, query.year);
        const billsWhere = buildBillsWhere(query, nextPeriodStart, startDate, endDate);
        const [activeQuickBooksConnection, summaryPurchaseOrders] = await prisma.$transaction([
            prisma.quickBooksConnection.findFirst({
                where: { status: 'CONNECTED', disconnectedAt: null },
                orderBy: { updatedAt: 'desc' },
                select: { realmId: true },
            }),
            prisma.purchaseOrder.findMany({
                where: billsWhere,
                select: {
                    id: true,
                    total: true,
                    project: { select: { id: true, name: true, jobNumber: true } },
                    plannedPayments: {
                        where: { month: query.month, year: query.year },
                        select: { amount: true, isReady: true },
                        take: 1,
                    },
                },
            }),
        ]);

        const purchaseOrderIds = summaryPurchaseOrders.map((po) => po.id);
        const [paymentTotals, periodPaymentTotals, subChangeOrders] =
            purchaseOrderIds.length > 0
                ? await prisma.$transaction([
                      prisma.poPayment.groupBy({
                          by: ['purchaseOrderId'],
                          orderBy: { purchaseOrderId: 'asc' },
                          where: { purchaseOrderId: { in: purchaseOrderIds } },
                          _sum: { amount: true },
                      }),
                      prisma.poPayment.groupBy({
                          by: ['purchaseOrderId'],
                          orderBy: { purchaseOrderId: 'asc' },
                          where: {
                              purchaseOrderId: { in: purchaseOrderIds },
                              txnDate: {
                                  gte: startDate,
                                  lte: endDate,
                              },
                          },
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
                              id: true,
                              scoNumber: true,
                              amount: true,
                              negotiatedDiscount: true,
                              shippingHandlingFee: true,
                              taxPercent: true,
                              taxAmount: true,
                          },
                      }),
                  ])
                : [[], [], []];

        const totalPaidByPurchaseOrderId = new Map(
            paymentTotals.map((total) => [total.purchaseOrderId, toDecimal(total._sum?.amount)])
        );
        const paidThisMonthByPurchaseOrderId = new Map(
            periodPaymentTotals.map((total) => [
                total.purchaseOrderId,
                toDecimal(total._sum?.amount),
            ])
        );
        const scosByPurchaseOrderId = new Map<string, typeof subChangeOrders>();
        for (const sco of subChangeOrders) {
            const list = scosByPurchaseOrderId.get(sco.purchaseOrderId) ?? [];
            list.push(sco);
            scosByPurchaseOrderId.set(sco.purchaseOrderId, list);
        }

        const projectsById = new Map(
            summaryPurchaseOrders.map((po) => [po.project.id, po.project] as const)
        );
        const sortedProjects = sortMonthlyBillProjects(Array.from(projectsById.values()));
        const pagination = buildMonthlyBillsPagination(query, sortedProjects.length);
        const pageStart = (query.page - 1) * query.size;
        const pageProjects = sortedProjects.slice(pageStart, pageStart + query.size);
        const pageProjectIds = pageProjects.map((project) => project.id);
        const purchaseOrders =
            pageProjectIds.length > 0
                ? await prisma.purchaseOrder.findMany({
                      where: {
                          AND: [billsWhere, { projectId: { in: pageProjectIds } }],
                      },
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
                                      gte: startDate,
                                      lte: endDate,
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
                  })
                : [];

        const vendorIds = Array.from(new Set(purchaseOrders.map((po) => po.vendor.id)));
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
        const projectOrder = new Map(pageProjectIds.map((projectId, index) => [projectId, index]));
        purchaseOrders.sort((left, right) => {
            const leftProjectOrder = projectOrder.get(left.project.id) ?? 0;
            const rightProjectOrder = projectOrder.get(right.project.id) ?? 0;
            if (leftProjectOrder !== rightProjectOrder) return leftProjectOrder - rightProjectOrder;
            return left.poNumber.localeCompare(right.poNumber, undefined, {
                numeric: true,
                sensitivity: 'base',
            });
        });

        const groups = new Map<string, MonthlyBillProjectGroup>(
            pageProjects.map((project) => [project.id, { project, bills: [] }])
        );

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
                    issuedAt: po.issuedAt ? formatMonthlyBillTimestamp(po.issuedAt) : null,
                    subChangeOrdersCount,
                    subChangeOrders: poScos.map((sco) => ({
                        id: sco.id,
                        scoNumber: sco.scoNumber,
                        amount: sco.amount,
                    })),
                },
                poTotal,
                scoTotal: subChangeOrdersTotal,
                original,
                totalPaid,
                balance: original.minus(totalPaid),
                plannedPayment: normalizedPlannedPayment,
                payments: po.poPayments.map((p) => ({
                    ...p,
                    txnDate: formatDateOnlyDisplay(p.txnDate),
                })),
            };

            const group = groups.get(po.project.id) ?? { project: po.project, bills: [] };
            group.bills.push(bill);
            groups.set(po.project.id, group);
        }

        const groupedBills = Array.from(groups.values()).filter((group) => group.bills.length > 0);
        const dateOnlyBounds = getMonthlyBillDateOnlyBoundsIso(query.year, query.month);

        return {
            groups: groupedBills,
            meta: {
                period: {
                    month: query.month,
                    year: query.year,
                    label: formatMonthlyBillPeriodLabel(query.year, query.month),
                    isCurrent: isCurrentPeriod,
                    ...dateOnlyBounds,
                    defaultTxnDate: getMonthlyBillDefaultTxnDate(query.year, query.month),
                },
                capabilities: {
                    canUpdateBills: canUpdateListedMonthlyBills(query, isCurrentPeriod),
                    canMarkPayment: canMarkListedMonthlyBills(query, isCurrentPeriod),
                },
                summary: summarizeMonthlyBills(
                    summaryPurchaseOrders,
                    totalPaidByPurchaseOrderId,
                    paidThisMonthByPurchaseOrderId,
                    scosByPurchaseOrderId
                ),
                pagination,
            },
        };
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

        const purchaseOrderIds = request.items.map((item) => item.purchaseOrderId);
        if (new Set(purchaseOrderIds).size !== purchaseOrderIds.length) {
            throw new BadRequestError(
                'Duplicate purchase orders are not allowed in one bulk save.'
            );
        }

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: { id: { in: purchaseOrderIds }, deletedAt: null },
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
        if (purchaseOrders.length !== purchaseOrderIds.length) {
            throw new NotFoundError('One or more purchase orders were not found.');
        }

        if (!canManageAllMonthlyBills(request.userRole)) {
            if (request.userRole !== 'pm' || !request.employeeId) {
                throw new ForbiddenError('You are not allowed to update planned payments.');
            }

            const projectIds = Array.from(new Set(purchaseOrders.map((po) => po.projectId)));
            const projectCount = await prisma.project.count({
                where: {
                    id: { in: projectIds },
                    deletedAt: null,
                    ...buildProjectManagerWhere(request.employeeId),
                },
            });
            if (projectCount !== projectIds.length) {
                throw new ForbiddenError('You can only update bills for your projects.');
            }
        }

        const purchaseOrderById = new Map(purchaseOrders.map((po) => [po.id, po]));
        const normalizedItems = request.items.map((item) => {
            const purchaseOrder = purchaseOrderById.get(item.purchaseOrderId);
            if (!purchaseOrder) {
                throw new NotFoundError('Purchase order not found.');
            }

            const amount = new Decimal(item.amount);
            const balance = getBillBalance(purchaseOrder);
            if (amount.greaterThan(balance)) {
                throw new BadRequestError(
                    'Planned payment cannot exceed the remaining bill balance.'
                );
            }

            return {
                ...item,
                amount,
                isReady: amount.greaterThan(0) ? item.isReady : false,
            };
        });

        return prisma.$transaction(
            normalizedItems.map((item) =>
                prisma.plannedPOPayment.upsert({
                    where: {
                        purchaseOrderId_month_year: {
                            purchaseOrderId: item.purchaseOrderId,
                            month: item.month,
                            year: item.year,
                        },
                    },
                    update: {
                        amount: item.amount,
                        ...(item.isReady !== undefined && { isReady: item.isReady }),
                    },
                    create: {
                        id: generateNanoId(),
                        purchaseOrderId: item.purchaseOrderId,
                        month: item.month,
                        year: item.year,
                        amount: item.amount,
                        isReady: item.isReady ?? false,
                    },
                })
            )
        );
    },

    /**
     * Record a ready planned payment as an actual payment in QuickBooks and
     * persist the resulting PoPayment. Restricted to admins, accountants, and A/P.
     */
    async markPayment(request: MarkPaymentInput) {
        if (!canManageAllMonthlyBills(request.userRole)) {
            throw new ForbiddenError('Only admins, accountants, and A/P can mark payments.');
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
                txnDate: request.txnDate,
                lineDescription: request.description,
                memo: request.memo || undefined,
                printLater: request.printLater,
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
