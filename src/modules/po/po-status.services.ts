import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { POStatusCreateRequest, POStatusUpdateRequest } from './po-status.models';

export const POStatusService = {
    list: async () => {
        return await prisma.pOStatus.findMany({
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const status = await prisma.pOStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('PO status not found');
        return status;
    },

    create: async (data: POStatusCreateRequest) => {
        const existing = await prisma.pOStatus.findFirst({
            where: {
                OR: [{ name: data.name }, { order: data.order }],
                deletedAt: null,
            },
        });

        if (existing) {
            throw new ConflictError('A PO status with this name or order already exists');
        }

        return await prisma.pOStatus.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: POStatusUpdateRequest) => {
        const status = await prisma.pOStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('PO status not found');

        if (data.name || data.order !== undefined) {
            const existing = await prisma.pOStatus.findFirst({
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
                throw new ConflictError('A PO status with this name or order already exists');
            }
        }

        return await prisma.pOStatus.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const status = await prisma.pOStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('PO status not found');

        if (status.isDefault) {
            throw new ConflictError('Cannot delete the default PO status');
        }

        const poCount = await prisma.purchaseOrder.count({
            where: { statusId: id },
        });

        if (poCount > 0) {
            throw new ConflictError(
                `Cannot delete status: ${poCount} purchase order(s) still reference it`
            );
        }

        await prisma.pOStatus.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
