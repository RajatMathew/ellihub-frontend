import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { SCOChangeTypeCreateRequest, SCOChangeTypeUpdateRequest } from './sco-change-type.models';

export const SCOChangeTypeService = {
    list: async () => {
        return await prisma.sCOChangeType.findMany({
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const changeType = await prisma.sCOChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('SCO change type not found');
        return changeType;
    },

    create: async (data: SCOChangeTypeCreateRequest) => {
        const existing = await prisma.sCOChangeType.findFirst({
            where: {
                OR: [{ name: data.name }, { code: data.code }, { order: data.order }],
            },
        });

        if (existing) {
            throw new ConflictError(
                'An SCO change type with this name, code, or order already exists'
            );
        }

        return await prisma.sCOChangeType.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: SCOChangeTypeUpdateRequest) => {
        const changeType = await prisma.sCOChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('SCO change type not found');

        if (data.name || data.code || data.order !== undefined) {
            const existing = await prisma.sCOChangeType.findFirst({
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
                    'An SCO change type with this name, code, or order already exists'
                );
            }
        }

        return await prisma.sCOChangeType.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const changeType = await prisma.sCOChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('SCO change type not found');

        const scoCount = await prisma.purchaseOrderCO.count({
            where: { changeTypeId: id },
        });

        if (scoCount > 0) {
            throw new ConflictError(
                `Cannot delete change type: ${scoCount} SCO(s) still reference it`
            );
        }

        await prisma.sCOChangeType.delete({ where: { id } });
    },
};
