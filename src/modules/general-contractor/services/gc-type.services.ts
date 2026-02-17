import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { GCTypeCreateRequest, GCTypeUpdateRequest } from '../models/gc-type.models';

export const GCTypeService = {
    getGCTypes: async () => {
        return await prisma.gCType.findMany({
            orderBy: { name: 'asc' },
        });
    },

    getGCType: async (id: string) => {
        const gcType = await prisma.gCType.findUnique({ where: { id } });
        if (!gcType) throw new NotFoundError('GC type not found');
        return gcType;
    },

    createGCType: async (data: GCTypeCreateRequest) => {
        const existing = await prisma.gCType.findFirst({
            where: {
                OR: [{ name: data.name }, { code: data.code }],
            },
        });

        if (existing) {
            throw new ConflictError('A GC type with this name or code already exists');
        }

        return await prisma.gCType.create({
            data: {
                id: ulid(),
                ...data,
            },
        });
    },

    updateGCType: async (id: string, data: GCTypeUpdateRequest) => {
        const gcType = await prisma.gCType.findUnique({ where: { id } });
        if (!gcType) throw new NotFoundError('GC type not found');

        if (data.name || data.code) {
            const existing = await prisma.gCType.findFirst({
                where: {
                    OR: [
                        ...(data.name ? [{ name: data.name }] : []),
                        ...(data.code ? [{ code: data.code }] : []),
                    ],
                    NOT: { id },
                },
            });

            if (existing) {
                throw new ConflictError('A GC type with this name or code already exists');
            }
        }

        return await prisma.gCType.update({
            where: { id },
            data,
        });
    },

    deleteGCType: async (id: string): Promise<void> => {
        const gcType = await prisma.gCType.findUnique({ where: { id } });
        if (!gcType) throw new NotFoundError('GC type not found');

        const gcCount = await prisma.generalContractor.count({
            where: { gcTypeId: id },
        });

        if (gcCount > 0) {
            throw new ConflictError(
                `Cannot delete GC type: ${gcCount} general contractor(s) still reference it`
            );
        }

        await prisma.gCType.delete({ where: { id } });
    },
};
