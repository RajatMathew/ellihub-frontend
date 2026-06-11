import { Prisma } from '@db/browser';
import { prisma } from '@lib/prisma';
import { UnauthorizedError } from '@utils/error';
import { parseISO } from 'date-fns';
import { Decimal } from 'decimal.js';

import type { MonthlyBillItem, MonthlyBillsQuery } from './models';
export const MonthlyBillsService = {
    async listMonthlyBills(query: MonthlyBillsQuery): Promise<MonthlyBillItem[]> {
        let purchaseOrders: {
            id: string;
            poNumber: string;
            vendor: {
                id: string;
                name: string;
            };
            issuedAt?: Date | null;
            total: Decimal | number;
        }[] = [];

        const selectFields: Prisma.PurchaseOrderSelect = {
            id: true,
            poNumber: true,
            issuedAt: true,
            vendor: true,
            total: true,
        };

        if (query.userRole === 'accountant' || query.userRole === 'admin') {
            purchaseOrders = await prisma.purchaseOrder.findMany({
                where: {
                    issuedAt: {
                        lte: parseISO(query.endDate),
                    },
                    fullyPaid: false,
                },
                select: selectFields,
            });
        } else if (query.userRole === 'pm') {
            purchaseOrders = await prisma.purchaseOrder.findMany({
                where: {
                    issuedAt: {
                        lte: parseISO(query.endDate),
                    },
                    fullyPaid: false,
                    project: {
                        teamMembers: {
                            some: {
                                employeeId: query.employeeId,
                                role: 'Lead PM',
                            },
                        },
                    },
                },
                select: selectFields,
            });
        } else {
            throw new UnauthorizedError('You are not allowed to access this data.');
        }

        const items: MonthlyBillItem[] = [];

        for (const po of purchaseOrders) {
            const payments = await prisma.poPayment.findMany({
                where: {
                    purchaseOrderId: po.id,
                },
            });

            const plannedPayment = await prisma.plannedPOPayment.findFirst({
                where: {
                    purchaseOrderId: po.id,
                    month: query.month,
                    year: query.year,
                },
            });

            let totalPaid = new Decimal(0);

            for (const payment of payments) totalPaid = totalPaid.add(payment.amount);

            items.push({
                purchaseOrder: po,
                payments,
                plannedPayment,
                original: new Decimal(po.total),
                balance: new Decimal(po.total).minus(totalPaid),
                totalPaid,
            });
        }

        return items;
    },
};
