import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { QuoteStatusCreateRequest, QuoteStatusUpdateRequest } from './quote-status.models';

export const QuoteStatusService = {
    list: async () => {
        return await prisma.quoteStatus.findMany({
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const status = await prisma.quoteStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Quote status not found');
        return status;
    },

    create: async (data: QuoteStatusCreateRequest) => {
        const existing = await prisma.quoteStatus.findFirst({
            where: {
                OR: [{ name: data.name }, { order: data.order }],
                deletedAt: null,
            },
        });

        if (existing) {
            throw new ConflictError('A quote status with this name or order already exists');
        }

        return await prisma.quoteStatus.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: QuoteStatusUpdateRequest) => {
        const status = await prisma.quoteStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Quote status not found');

        if (data.name || data.order !== undefined) {
            const existing = await prisma.quoteStatus.findFirst({
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
                throw new ConflictError('A quote status with this name or order already exists');
            }
        }

        return await prisma.quoteStatus.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const status = await prisma.quoteStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Quote status not found');

        if (status.isDefault) {
            throw new ConflictError('Cannot delete the default quote status');
        }

        const quoteCount = await prisma.vendorQuote.count({
            where: { statusId: id },
        });

        if (quoteCount > 0) {
            throw new ConflictError(
                `Cannot delete status: ${quoteCount} quote(s) still reference it`
            );
        }

        await prisma.quoteStatus.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
