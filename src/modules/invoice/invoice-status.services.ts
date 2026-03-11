import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { InvoiceStatusCreateRequest, InvoiceStatusUpdateRequest } from './invoice-status.models';

export const InvoiceStatusService = {
    list: async () => {
        return await prisma.invoiceStatus.findMany({
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const status = await prisma.invoiceStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Invoice status not found');
        return status;
    },

    create: async (data: InvoiceStatusCreateRequest) => {
        const existing = await prisma.invoiceStatus.findFirst({
            where: {
                OR: [{ name: data.name }, { order: data.order }],
                deletedAt: null,
            },
        });

        if (existing) {
            throw new ConflictError('An invoice status with this name or order already exists');
        }

        return await prisma.invoiceStatus.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: InvoiceStatusUpdateRequest) => {
        const status = await prisma.invoiceStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Invoice status not found');

        if (data.name || data.order !== undefined) {
            const existing = await prisma.invoiceStatus.findFirst({
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
                throw new ConflictError('An invoice status with this name or order already exists');
            }
        }

        return await prisma.invoiceStatus.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const status = await prisma.invoiceStatus.findUnique({ where: { id } });
        if (!status || status.deletedAt) throw new NotFoundError('Invoice status not found');

        if (status.isDefault) {
            throw new ConflictError('Cannot delete the default invoice status');
        }

        const invoiceCount = await prisma.invoice.count({
            where: { statusId: id },
        });

        if (invoiceCount > 0) {
            throw new ConflictError(
                `Cannot delete status: ${invoiceCount} invoice(s) still reference it`
            );
        }

        await prisma.invoiceStatus.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
