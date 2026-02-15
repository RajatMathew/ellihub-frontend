import { Contact } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    ContactCreateRequest,
    ContactEntityTypeCreateRequest,
    ContactEntityTypeUpdateRequest,
    ContactUpdateRequest,
    ProfessionalRoleCreateRequest,
    ProfessionalRoleUpdateRequest,
} from './models';

const contactIncludes = {
    professionalRole: true,
    entityLinks: {
        include: {
            entityType: true,
        },
    },
} as const;

export const ContactService = {
    createContact: async (request: ContactCreateRequest) => {
        const { entityLinks, ...contactData } = request;

        if (contactData.professionalRoleId) {
            const role = await prisma.professionalRole.findUnique({
                where: { id: contactData.professionalRoleId },
            });

            if (!role) {
                throw new NotFoundError('Professional role not found');
            }

            checkDeletedAt(role);
        }

        if (entityLinks.length > 0) {
            const entityTypeIds = [...new Set(entityLinks.map((l) => l.entityTypeId))];
            const entityTypes = await prisma.contactEntityType.findMany({
                where: { id: { in: entityTypeIds } },
            });

            for (const id of entityTypeIds) {
                const entityType = entityTypes.find((t) => t.id === id);
                if (!entityType) {
                    throw new NotFoundError(`Entity type not found: ${id}`);
                }
                checkDeletedAt(entityType);
            }
        }

        return await prisma.$transaction(async (tx) => {
            const contactId = ulid();

            await tx.contact.create({
                data: {
                    id: contactId,
                    fullName: contactData.fullName,
                    professionalRoleId: contactData.professionalRoleId,
                    emails: contactData.emails,
                    phoneNumbers: contactData.phoneNumbers,
                    tags: contactData.tags,
                },
            });

            if (entityLinks.length > 0) {
                await tx.contactEntityLink.createMany({
                    data: entityLinks.map((link) => ({
                        id: ulid(),
                        contactId,
                        entityTypeId: link.entityTypeId,
                        entityId: link.entityId,
                    })),
                });
            }

            return await tx.contact.findUniqueOrThrow({
                where: { id: contactId },
                include: contactIncludes,
            });
        });
    },

    getContacts: async (
        params: PaginationParams
    ): Promise<{
        data: Contact[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const { search: filterSearch, professionalRoleId, entityTypeId, entityId, ...restFilter } =
            filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(professionalRoleId && { professionalRoleId }),
            ...(search && {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' as const } },
                    { emails: { string_contains: search } },
                ],
            }),
            ...((entityTypeId || entityId) && {
                entityLinks: {
                    some: {
                        ...(entityTypeId && { entityTypeId }),
                        ...(entityId && { entityId }),
                    },
                },
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.contact.count({
                where: whereClause,
            }),

            prisma.contact.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof Contact]: sortOrder,
                },
                include: contactIncludes,
            }),
        ]);

        return { data, count };
    },

    getContact: async (id: string) => {
        const contact = await prisma.contact.findUnique({
            where: { id },
            include: contactIncludes,
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        return contact;
    },

    updateContact: async (id: string, request: ContactUpdateRequest) => {
        const contact = await prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        if (request.professionalRoleId) {
            const role = await prisma.professionalRole.findUnique({
                where: { id: request.professionalRoleId },
            });

            if (!role) {
                throw new NotFoundError('Professional role not found');
            }

            checkDeletedAt(role);
        }

        return await prisma.contact.update({
            where: { id },
            data: {
                ...request,
            },
            include: contactIncludes,
        });
    },

    deleteContact: async (id: string): Promise<void> => {
        const contact = await prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        await prisma.contact.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    },

    // ProfessionalRole CRUD
    getProfessionalRoles: async () => {
        return await prisma.professionalRole.findMany({
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
        });
    },

    getProfessionalRole: async (id: string) => {
        const role = await prisma.professionalRole.findUnique({
            where: { id },
        });

        if (!role) {
            throw new NotFoundError('Professional role not found');
        }

        checkDeletedAt(role);
        return role;
    },

    createProfessionalRole: async (request: ProfessionalRoleCreateRequest) => {
        const existing = await prisma.professionalRole.findFirst({
            where: { name: request.name, deletedAt: null },
        });

        if (existing) {
            throw new ConflictError('A professional role with this name already exists');
        }

        return await prisma.professionalRole.create({
            data: {
                id: ulid(),
                name: request.name,
            },
        });
    },

    updateProfessionalRole: async (id: string, request: ProfessionalRoleUpdateRequest) => {
        const role = await prisma.professionalRole.findUnique({
            where: { id },
        });

        if (!role) {
            throw new NotFoundError('Professional role not found');
        }

        checkDeletedAt(role);

        if (request.name) {
            const existing = await prisma.professionalRole.findFirst({
                where: { name: request.name, deletedAt: null, NOT: { id } },
            });

            if (existing) {
                throw new ConflictError('A professional role with this name already exists');
            }
        }

        return await prisma.professionalRole.update({
            where: { id },
            data: { ...request },
        });
    },

    deleteProfessionalRole: async (id: string): Promise<void> => {
        const role = await prisma.professionalRole.findUnique({
            where: { id },
        });

        if (!role) {
            throw new NotFoundError('Professional role not found');
        }

        checkDeletedAt(role);

        await prisma.professionalRole.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },

    // ContactEntityType CRUD
    getContactEntityTypes: async () => {
        return await prisma.contactEntityType.findMany({
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
        });
    },

    getContactEntityType: async (id: string) => {
        const entityType = await prisma.contactEntityType.findUnique({
            where: { id },
        });

        if (!entityType) {
            throw new NotFoundError('Contact entity type not found');
        }

        checkDeletedAt(entityType);
        return entityType;
    },

    createContactEntityType: async (request: ContactEntityTypeCreateRequest) => {
        const existing = await prisma.contactEntityType.findFirst({
            where: { name: request.name, deletedAt: null },
        });

        if (existing) {
            throw new ConflictError('A contact entity type with this name already exists');
        }

        return await prisma.contactEntityType.create({
            data: {
                id: ulid(),
                name: request.name,
            },
        });
    },

    updateContactEntityType: async (id: string, request: ContactEntityTypeUpdateRequest) => {
        const entityType = await prisma.contactEntityType.findUnique({
            where: { id },
        });

        if (!entityType) {
            throw new NotFoundError('Contact entity type not found');
        }

        checkDeletedAt(entityType);

        if (request.name) {
            const existing = await prisma.contactEntityType.findFirst({
                where: { name: request.name, deletedAt: null, NOT: { id } },
            });

            if (existing) {
                throw new ConflictError('A contact entity type with this name already exists');
            }
        }

        return await prisma.contactEntityType.update({
            where: { id },
            data: { ...request },
        });
    },

    deleteContactEntityType: async (id: string): Promise<void> => {
        const entityType = await prisma.contactEntityType.findUnique({
            where: { id },
        });

        if (!entityType) {
            throw new NotFoundError('Contact entity type not found');
        }

        checkDeletedAt(entityType);

        await prisma.contactEntityType.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};
