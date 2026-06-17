import { Lookup } from '@db/client';
import { prisma } from '@lib/prisma';
import { ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';

import { LookupCreateRequest, LookupType, LookupUpdateRequest } from './models';

const DEFAULT_LOOKUP_LABELS: Partial<Record<LookupType, string[]>> = {
    [LookupType.PAYMENT_METHOD]: ['ACH', 'Check', 'Wire Transfer', 'Credit Card', 'Other'],
    [LookupType.PROJECT_CONTRACT_TYPE]: ['Lump Sum', 'GMP'],
};

async function ensureDefaultLookups(type: string): Promise<void> {
    const labels = DEFAULT_LOOKUP_LABELS[type as LookupType];
    if (!labels?.length) return;

    await Promise.all(
        labels.map((label) =>
            prisma.lookup.upsert({
                where: { type_label: { type, label } },
                update: {},
                create: {
                    id: generateNanoId(),
                    type,
                    label,
                },
            })
        )
    );
}

async function ensureAllDefaultLookups(): Promise<void> {
    await Promise.all(Object.values(LookupType).map((type) => ensureDefaultLookups(type)));
}

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
                id: generateNanoId(),
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
        await ensureAllDefaultLookups();

        return await prisma.lookup.findMany({
            orderBy: { type: 'asc' },
        });
    },

    listByType: async (type: string): Promise<Lookup[]> => {
        await ensureDefaultLookups(type);

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
