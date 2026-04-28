import { Lookup } from '@db/client';
import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { LookupCreateRequest, LookupUpdateRequest } from './models';

export const LookupService = {
    create: async (request: LookupCreateRequest): Promise<Lookup> => {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: request.type, label: request.label } },
        });

        if (existing) {
            throw new ConflictError('A lookup with this type and label already exists');
        }

        return await prisma.lookup.create({
            data: {
                id: ulid(),
                ...request,
            },
        });
    },

    update: async (request: LookupUpdateRequest): Promise<Lookup> => {
        const lookup = await prisma.lookup.findUnique({ where: { id: request.id } });

        if (!lookup) {
            throw new NotFoundError('Lookup not found');
        }

        const newType = request.type ?? lookup.type;
        const newLabel = request.label ?? lookup.label;

        if (newType !== lookup.type || newLabel !== lookup.label) {
            const existing = await prisma.lookup.findUnique({
                where: { type_label: { type: newType, label: newLabel } },
            });

            if (existing && existing.id !== request.id) {
                throw new ConflictError('A lookup with this type and label already exists');
            }
        }

        return await prisma.lookup.update({
            where: { id: request.id },
            data: {
                type: request.type,
                label: request.label,
            },
        });
    },

    get: async (id: string): Promise<Lookup> => {
        const lookup = await prisma.lookup.findUnique({ where: { id } });

        if (!lookup) {
            throw new NotFoundError('Lookup not found');
        }

        return lookup;
    },

    list: async (): Promise<Lookup[]> => {
        return await prisma.lookup.findMany({
            orderBy: { type: 'asc' },
        });
    },

    listByType: async (type: string): Promise<Lookup[]> => {
        return await prisma.lookup.findMany({
            where: { type },
            orderBy: { label: 'asc' },
        });
    },

    delete: async (id: string): Promise<void> => {
        const lookup = await prisma.lookup.findUnique({ where: { id } });

        if (!lookup) {
            throw new NotFoundError('Lookup not found');
        }

        await prisma.lookup.delete({ where: { id } });
    },
};
