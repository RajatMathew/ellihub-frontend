import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    AddendumChangeTypeCreateRequest,
    AddendumChangeTypeUpdateRequest,
} from './addendum-change-type.models';

export const AddendumChangeTypeService = {
    list: async () => {
        return await prisma.addendumChangeType.findMany({
            orderBy: { order: 'asc' },
        });
    },

    get: async (id: string) => {
        const changeType = await prisma.addendumChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('Addendum change type not found');
        return changeType;
    },

    create: async (data: AddendumChangeTypeCreateRequest) => {
        const existing = await prisma.addendumChangeType.findFirst({
            where: {
                OR: [{ name: data.name }, { code: data.code }, { order: data.order }],
            },
        });

        if (existing) {
            throw new ConflictError(
                'An addendum change type with this name, code, or order already exists'
            );
        }

        return await prisma.addendumChangeType.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    update: async (id: string, data: AddendumChangeTypeUpdateRequest) => {
        const changeType = await prisma.addendumChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('Addendum change type not found');

        if (data.name || data.code || data.order !== undefined) {
            const existing = await prisma.addendumChangeType.findFirst({
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
                    'An addendum change type with this name, code, or order already exists'
                );
            }
        }

        return await prisma.addendumChangeType.update({
            where: { id },
            data,
        });
    },

    delete: async (id: string): Promise<void> => {
        const changeType = await prisma.addendumChangeType.findUnique({ where: { id } });
        if (!changeType) throw new NotFoundError('Addendum change type not found');

        const addendumCount = await prisma.rFQAddendum.count({
            where: { changeTypeId: id },
        });

        if (addendumCount > 0) {
            throw new ConflictError(
                `Cannot delete change type: ${addendumCount} addendum(s) still reference it`
            );
        }

        await prisma.addendumChangeType.delete({ where: { id } });
    },
};
