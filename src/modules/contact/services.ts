import { Contact, Prisma } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    ContactCreateRequest,
    ContactEntityTypeCreateRequest,
    ContactEntityTypeUpdateRequest,
    ContactUpdateRequest,
    EmailAddRequest,
    EntityLinkCreateRequest,
    PhoneAddRequest,
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
                    email: contactData.email ?? undefined,
                    phoneNumber: contactData.phoneNumber ?? undefined,
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
        const {
            search: filterSearch,
            professionalRoleId,
            entityTypeId,
            entityId,
            ...restFilter
        } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(professionalRoleId && { professionalRoleId }),
            ...(search && {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' as const } },
                    { email: { string_contains: search } },
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

        const data: Record<string, unknown> = {};
        if (request.fullName !== undefined) data.fullName = request.fullName;
        if (request.tags !== undefined) data.tags = request.tags;
        if (request.professionalRoleId !== undefined) {
            data.professionalRoleId = request.professionalRoleId;
        }
        if (request.email !== undefined) {
            data.email = request.email === null ? Prisma.JsonNull : request.email;
        }
        if (request.phoneNumber !== undefined) {
            data.phoneNumber = request.phoneNumber === null ? Prisma.JsonNull : request.phoneNumber;
        }

        return await prisma.contact.update({
            where: { id },
            data,
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

    // Sub-resource methods
    getActiveContact: async (id: string) => {
        const contact = await prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);
        return contact;
    },

    addPhone: async (contactId: string, data: PhoneAddRequest) => {
        const contact = await ContactService.getActiveContact(contactId);

        if (contact.phoneNumber !== null) {
            throw new ConflictError('Contact already has a phone number');
        }

        return await prisma.contact.update({
            where: { id: contactId },
            data: { phoneNumber: data },
            include: contactIncludes,
        });
    },

    removePhone: async (contactId: string) => {
        const contact = await ContactService.getActiveContact(contactId);

        if (contact.phoneNumber === null) {
            throw new NotFoundError('Contact does not have a phone number');
        }

        return await prisma.contact.update({
            where: { id: contactId },
            data: { phoneNumber: Prisma.JsonNull },
            include: contactIncludes,
        });
    },

    addEmail: async (contactId: string, data: EmailAddRequest) => {
        const contact = await ContactService.getActiveContact(contactId);

        if (contact.email !== null) {
            throw new ConflictError('Contact already has an email');
        }

        return await prisma.contact.update({
            where: { id: contactId },
            data: { email: data },
            include: contactIncludes,
        });
    },

    removeEmail: async (contactId: string) => {
        const contact = await ContactService.getActiveContact(contactId);

        if (contact.email === null) {
            throw new NotFoundError('Contact does not have an email');
        }

        return await prisma.contact.update({
            where: { id: contactId },
            data: { email: Prisma.JsonNull },
            include: contactIncludes,
        });
    },

    addEntityLink: async (contactId: string, data: EntityLinkCreateRequest) => {
        await ContactService.getActiveContact(contactId);

        const entityType = await prisma.contactEntityType.findUnique({
            where: { id: data.entityTypeId },
        });

        if (!entityType) {
            throw new NotFoundError('Entity type not found');
        }

        checkDeletedAt(entityType);

        try {
            const link = await prisma.contactEntityLink.create({
                data: {
                    id: ulid(),
                    contactId,
                    entityTypeId: data.entityTypeId,
                    entityId: data.entityId,
                    isPrimary: data.isPrimary,
                },
                include: { entityType: true },
            });
            return link;
        } catch (err) {
            if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new ConflictError('This contact is already linked to this entity');
            }
            throw err;
        }
    },

    removeEntityLink: async (contactId: string, linkId: string) => {
        await ContactService.getActiveContact(contactId);

        const link = await prisma.contactEntityLink.findUnique({
            where: { id: linkId },
        });

        if (!link || link.contactId !== contactId) {
            throw new NotFoundError('Entity link not found');
        }

        await prisma.contactEntityLink.delete({
            where: { id: linkId },
        });
    },

    // Directory KPIs
    getDirectoryKpis: async () => {
        const [totalContacts, primaryContacts, gcLinks, vendorLinks] = await prisma.$transaction([
            prisma.contact.count({
                where: { deletedAt: null },
            }),
            prisma.contactEntityLink.count({
                where: {
                    isPrimary: true,
                    contact: { deletedAt: null },
                },
            }),
            prisma.contactEntityLink.count({
                where: {
                    entityType: { name: 'General Contractor' },
                    contact: { deletedAt: null },
                },
            }),
            prisma.contactEntityLink.count({
                where: {
                    entityType: { name: 'Vendor' },
                    contact: { deletedAt: null },
                },
            }),
        ]);

        return { totalContacts, primaryContacts, gcLinks, vendorLinks };
    },
};
