import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { RFQStatusCreateRequest, RFQStatusUpdateRequest } from './rfq-status.models';

export const RFQStatusService = {
    list: async () => {
        return await prisma.rFQStatus.findMany({
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const status = await prisma.rFQStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('RFQ status not found');
        return status;
    },

    create: async (data: RFQStatusCreateRequest) => {
        const existing = await prisma.rFQStatus.findFirst({
            where: {
                OR: [{ name: data.name }, { order: data.order }],
                deletedAt: null,
            },
        });

        if (existing) {
            throw new ConflictError('An RFQ status with this name or order already exists');
        }

        return await prisma.rFQStatus.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: RFQStatusUpdateRequest) => {
        const status = await prisma.rFQStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('RFQ status not found');

        if (data.name || data.order !== undefined) {
            const existing = await prisma.rFQStatus.findFirst({
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
                throw new ConflictError('An RFQ status with this name or order already exists');
            }
        }

        return await prisma.rFQStatus.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const status = await prisma.rFQStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('RFQ status not found');

        if (status.isDefault) {
            throw new ConflictError('Cannot delete the default RFQ status');
        }

        const rfqCount = await prisma.rFQ.count({
            where: { statusId: id },
        });

        if (rfqCount > 0) {
            throw new ConflictError(`Cannot delete status: ${rfqCount} RFQ(s) still reference it`);
        }

        await prisma.rFQStatus.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
