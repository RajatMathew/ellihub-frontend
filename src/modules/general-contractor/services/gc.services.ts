import { GeneralContractor } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { GCContactAddRequest, GCContactUpdateRequest, GCCreateRequest, GCUpdateRequest } from '../models/gc.models';

const gcIncludes = {
    gcType: true,
    contactLinks: {
        include: {
            contact: true,
        },
    },
} as const;

const gcListIncludes = {
    gcType: true,
    _count: {
        select: {
            projects: true,
            contactLinks: true,
        },
    },
} as const;

export const GeneralContractorService = {
    createGC: async (data: GCCreateRequest) => {
        const { contacts, ...gcData } = data;

        const gcType = await prisma.gCType.findUnique({
            where: { id: gcData.gcTypeId },
        });
        if (!gcType) throw new NotFoundError('GC type not found');

        if (contacts.length > 0) {
            const contactIds = [...new Set(contacts.map((c) => c.contactId))];
            const existingContacts = await prisma.contact.findMany({
                where: { id: { in: contactIds }, deletedAt: null },
            });

            for (const id of contactIds) {
                if (!existingContacts.find((c) => c.id === id)) {
                    throw new NotFoundError(`Contact not found: ${id}`);
                }
            }
        }

        return await prisma.$transaction(async (tx) => {
            const gcId = ulid();

            await tx.generalContractor.create({
                data: {
                    id: gcId,
                    ...gcData,
                },
            });

            if (contacts.length > 0) {
                await tx.contactGC.createMany({
                    data: contacts.map((c) => ({
                        id: ulid(),
                        contactId: c.contactId,
                        generalContractorId: gcId,
                        isPrimary: c.isPrimary ?? false,
                    })),
                });
            }

            return await tx.generalContractor.findUniqueOrThrow({
                where: { id: gcId },
                include: gcIncludes,
            });
        });
    },

    getGCs: async (
        params: PaginationParams
    ): Promise<{ data: GeneralContractor[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const { search: filterSearch, status, gcTypeId, ...restFilter } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(status && { status }),
            ...(gcTypeId && { gcTypeId }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.generalContractor.count({ where: whereClause }),
            prisma.generalContractor.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof GeneralContractor]: sortOrder,
                },
                include: gcListIncludes,
            }),
        ]);

        return { data, count };
    },

    getGC: async (id: string) => {
        const gc = await prisma.generalContractor.findUnique({
            where: { id },
            include: {
                ...gcIncludes,
                projects: true,
            },
        });

        if (!gc) throw new NotFoundError('General contractor not found');
        checkDeletedAt(gc);
        return gc;
    },

    updateGC: async (id: string, data: GCUpdateRequest) => {
        const gc = await prisma.generalContractor.findUnique({ where: { id } });
        if (!gc) throw new NotFoundError('General contractor not found');
        checkDeletedAt(gc);

        if (data.gcTypeId) {
            const gcType = await prisma.gCType.findUnique({
                where: { id: data.gcTypeId },
            });
            if (!gcType) throw new NotFoundError('GC type not found');
        }

        return await prisma.generalContractor.update({
            where: { id },
            data,
            include: gcIncludes,
        });
    },

    deleteGC: async (id: string) => {
        const gc = await prisma.generalContractor.findUnique({ where: { id } });
        if (!gc) throw new NotFoundError('General contractor not found');
        checkDeletedAt(gc);

        return await prisma.generalContractor.update({
            where: { id },
            data: { status: 'INACTIVE' },
            include: gcIncludes,
        });
    },

    addContact: async (gcId: string, data: GCContactAddRequest) => {
        const gc = await prisma.generalContractor.findUnique({ where: { id: gcId } });
        if (!gc) throw new NotFoundError('General contractor not found');
        checkDeletedAt(gc);

        const contact = await prisma.contact.findUnique({
            where: { id: data.contactId },
        });
        if (!contact) throw new NotFoundError('Contact not found');
        checkDeletedAt(contact);

        try {
            return await prisma.contactGC.create({
                data: {
                    id: ulid(),
                    contactId: data.contactId,
                    generalContractorId: gcId,
                    isPrimary: data.isPrimary,
                },
                include: { contact: true },
            });
        } catch (err) {
            if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new ConflictError('This contact is already linked to this general contractor');
            }
            throw err;
        }
    },

    updateContact: async (gcId: string, contactId: string, data: GCContactUpdateRequest) => {
        const link = await prisma.contactGC.findFirst({
            where: { generalContractorId: gcId, contactId },
        });
        if (!link) throw new NotFoundError('Contact link not found');

        return await prisma.contactGC.update({
            where: { id: link.id },
            data: { isPrimary: data.isPrimary },
            include: { contact: true },
        });
    },

    removeContact: async (gcId: string, contactId: string): Promise<void> => {
        const link = await prisma.contactGC.findFirst({
            where: { generalContractorId: gcId, contactId },
        });
        if (!link) throw new NotFoundError('Contact link not found');

        await prisma.contactGC.delete({ where: { id: link.id } });
    },

    getStats: async () => {
        const [totalGCs, activeProjects, commitedResult] = await prisma.$transaction([
            prisma.generalContractor.count({
                where: { deletedAt: null },
            }),
            prisma.project.count({
                where: {
                    gc: { deletedAt: null },
                },
            }),
            prisma.primeChangeOrder.aggregate({
                _sum: { amount: true },
            }),
        ]);

        return {
            totalGCs,
            activeProjects,
            totalCommitted: commitedResult._sum.amount ?? 0,
        };
    },
};
