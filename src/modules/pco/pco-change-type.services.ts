import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { PCOChangeTypeCreateRequest, PCOChangeTypeUpdateRequest } from './pco-change-type.models';

export const PCOChangeTypeService = {
    list: async () => {
        return await prisma.pCOChangeType.findMany({
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const changeType = await prisma.pCOChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('PCO change type not found');
        return changeType;
    },

    create: async (data: PCOChangeTypeCreateRequest) => {
        const existing = await prisma.pCOChangeType.findFirst({
            where: {
                OR: [{ name: data.name }, { code: data.code }, { order: data.order }],
            },
        });

        if (existing) {
            throw new ConflictError(
                'A PCO change type with this name, code, or order already exists'
            );
        }

        return await prisma.pCOChangeType.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: PCOChangeTypeUpdateRequest) => {
        const changeType = await prisma.pCOChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('PCO change type not found');

        if (data.name || data.code || data.order !== undefined) {
            const existing = await prisma.pCOChangeType.findFirst({
                where: {
                    OR: [
                        ...(data.name ? [{ name: data.name }] : []),
                        ...(data.code ? [{ code: data.code }] : []),
                        ...(data.order !== undefined ? [{ order: data.order }] : []),
                    ],
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictError(
                    'A PCO change type with this name, code, or order already exists'
                );
            }
        }

        return await prisma.pCOChangeType.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const changeType = await prisma.pCOChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('PCO change type not found');

        const pcoCount = await prisma.primeChangeOrder.count({
            where: { changeTypeId: id },
        });

        if (pcoCount > 0) {
            throw new ConflictError(
                `Cannot delete change type: ${pcoCount} PCO(s) still reference it`
            );
        }

        await prisma.pCOChangeType.delete({ where: { id } });
    },
};
