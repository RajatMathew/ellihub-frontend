import { Contact, Prisma } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    ContactCreateRequest,
    ContactUpdateRequest,
    EmailAddRequest,
    GCLinkCreateRequest,
    PhoneAddRequest,
    ProfessionalRoleCreateRequest,
    ProfessionalRoleUpdateRequest,
    VendorLinkCreateRequest,
} from './models';

const contactIncludes = {
    professionalRole: true,
    vendorLinks: true,
    gcLinks: true,
} as const;

export const ContactService = {
    createContact: async (request: ContactCreateRequest) => {
        const { vendorLinks, gcLinks, ...contactData } = request;

        if (contactData.professionalRoleId) {
            const role = await prisma.professionalRole.findUnique({
                where: { id: contactData.professionalRoleId },
            });

            if (!role) {
                throw new NotFoundError('Professional role not found');
            }

            checkDeletedAt(role);
        }

        if (vendorLinks.length > 0) {
            const vendorIds = [...new Set(vendorLinks.map((l) => l.vendorId))];
            const vendors = await prisma.vendor.findMany({
                where: { id: { in: vendorIds }, deletedAt: null },
            });

            for (const id of vendorIds) {
                if (!vendors.find((v) => v.id === id)) {
                    throw new NotFoundError(`Vendor not found: ${id}`);
                }
            }
        }

        if (gcLinks.length > 0) {
            const gcIds = [...new Set(gcLinks.map((l) => l.generalContractorId))];
            const gcs = await prisma.generalContractor.findMany({
                where: { id: { in: gcIds }, deletedAt: null },
            });

            for (const id of gcIds) {
                if (!gcs.find((gc) => gc.id === id)) {
                    throw new NotFoundError(`General contractor not found: ${id}`);
                }
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

            if (vendorLinks.length > 0) {
                await tx.contactVendor.createMany({
                    data: vendorLinks.map((link) => ({
                        id: ulid(),
                        contactId,
                        vendorId: link.vendorId,
                        isPrimary: link.isPrimary ?? false,
                    })),
                });
            }

            if (gcLinks.length > 0) {
                await tx.contactGC.createMany({
                    data: gcLinks.map((link) => ({
                        id: ulid(),
                        contactId,
                        generalContractorId: link.generalContractorId,
                        isPrimary: link.isPrimary ?? false,
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
            vendorId,
            generalContractorId,
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
            ...(vendorId && {
                vendorLinks: {
                    some: { vendorId },
                },
            }),
            ...(generalContractorId && {
                gcLinks: {
                    some: { generalContractorId },
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

    addVendorLink: async (contactId: string, data: VendorLinkCreateRequest) => {
        await ContactService.getActiveContact(contactId);

        const vendor = await prisma.vendor.findUnique({
            where: { id: data.vendorId },
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        try {
            return await prisma.contactVendor.create({
                data: {
                    id: ulid(),
                    contactId,
                    vendorId: data.vendorId,
                    isPrimary: data.isPrimary,
                },
            });
        } catch (err) {
            if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new ConflictError('This contact is already linked to this vendor');
            }
            throw err;
        }
    },

    removeVendorLink: async (contactId: string, linkId: string) => {
        await ContactService.getActiveContact(contactId);

        const link = await prisma.contactVendor.findUnique({
            where: { id: linkId },
        });

        if (!link || link.contactId !== contactId) {
            throw new NotFoundError('Vendor link not found');
        }

        await prisma.contactVendor.delete({
            where: { id: linkId },
        });
    },

    addGCLink: async (contactId: string, data: GCLinkCreateRequest) => {
        await ContactService.getActiveContact(contactId);

        const gc = await prisma.generalContractor.findUnique({
            where: { id: data.generalContractorId },
        });

        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }

        checkDeletedAt(gc);

        try {
            return await prisma.contactGC.create({
                data: {
                    id: ulid(),
                    contactId,
                    generalContractorId: data.generalContractorId,
                    isPrimary: data.isPrimary,
                },
            });
        } catch (err) {
            if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new ConflictError('This contact is already linked to this general contractor');
            }
            throw err;
        }
    },

    removeGCLink: async (contactId: string, linkId: string) => {
        await ContactService.getActiveContact(contactId);

        const link = await prisma.contactGC.findUnique({
            where: { id: linkId },
        });

        if (!link || link.contactId !== contactId) {
            throw new NotFoundError('GC link not found');
        }

        await prisma.contactGC.delete({
            where: { id: linkId },
        });
    },

    // Directory KPIs
    getDirectoryKpis: async () => {
        const [totalContacts, primaryVendorLinks, primaryGCLinks, gcLinks, vendorLinks] =
            await prisma.$transaction([
                prisma.contact.count({
                    where: { deletedAt: null },
                }),
                prisma.contactVendor.count({
                    where: {
                        isPrimary: true,
                        contact: { deletedAt: null },
                    },
                }),
                prisma.contactGC.count({
                    where: {
                        isPrimary: true,
                        contact: { deletedAt: null },
                    },
                }),
                prisma.contactGC.count({
                    where: {
                        contact: { deletedAt: null },
                    },
                }),
                prisma.contactVendor.count({
                    where: {
                        contact: { deletedAt: null },
                    },
                }),
            ]);

        return {
            totalContacts,
            primaryContacts: primaryVendorLinks + primaryGCLinks,
            gcLinks,
            vendorLinks,
        };
    },
};
