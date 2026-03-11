import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    ChangeOrderStatusCreateRequest,
    ChangeOrderStatusUpdateRequest,
} from './change-order-status.models';

export const ChangeOrderStatusService = {
    list: async () => {
        return await prisma.changeOrderStatus.findMany({
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const status = await prisma.changeOrderStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Change order status not found');
        return status;
    },

    create: async (data: ChangeOrderStatusCreateRequest) => {
        const existing = await prisma.changeOrderStatus.findFirst({
            where: {
                OR: [{ name: data.name }, { order: data.order }],
                deletedAt: null,
            },
        });

        if (existing) {
            throw new ConflictError('A change order status with this name or order already exists');
        }

        return await prisma.changeOrderStatus.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: ChangeOrderStatusUpdateRequest) => {
        const status = await prisma.changeOrderStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Change order status not found');

        if (data.name || data.order !== undefined) {
            const existing = await prisma.changeOrderStatus.findFirst({
                where: {
                    OR: [
                        ...(data.name ? [{ name: data.name }] : []),
                        ...(data.order !== undefined ? [{ order: data.order }] : []),
                    ],
                    NOT: { id },
                    deletedAt: null,
                },
            });

            if (existing) {
                throw new ConflictError(
                    'A change order status with this name or order already exists'
                );
            }
        }

        return await prisma.changeOrderStatus.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const status = await prisma.changeOrderStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Change order status not found');

        const pcoCount = await prisma.primeChangeOrder.count({
            where: { statusId: id },
        });

        const scoCount = await prisma.purchaseOrderCO.count({
            where: { statusId: id },
        });

        if (pcoCount + scoCount > 0) {
            throw new ConflictError(
                `Cannot delete status: ${pcoCount} PCO(s) and ${scoCount} SCO(s) still reference it`
            );
        }

        await prisma.changeOrderStatus.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
