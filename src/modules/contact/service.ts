import { Contact, ContactGC, ContactVendor } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddEmailToContactRequest,
    AddGcToContactRequest,
    AddPhoneToContactRequest,
    AddTagToContactRequest,
    AddVendorToContactRequest,
    ContactCreateRequest,
    ContactEmail,
    ContactPhone,
    ContactUpdateRequest,
    RemoveEmailFromContactRequest,
    RemoveGcFromContactRequest,
    RemovePhoneFromContactRequest,
    RemoveTagFromContactRequest,
    RemoveVendorFromContactRequest,
} from './models';

export const ContactService = {
    createContact: async (request: ContactCreateRequest): Promise<Contact> => {
        const { professionalRoleId, linkedGc, linkedVendors, email, phoneNumber, tags, fullName } =
            request;

        if (professionalRoleId) {
            const professionalRole = await prisma.lookup.findUnique({
                where: { id: professionalRoleId },
            });

            if (!professionalRole) {
                throw new NotFoundError('Professional role not found');
            }
        }

        if (linkedVendors && linkedVendors.length > 0) {
            const vendors = await prisma.vendor.findMany({
                where: {
                    id: { in: linkedVendors.map((v) => v.id) },
                    deletedAt: null,
                },
            });

            if (vendors.length !== linkedVendors.length) {
                throw new NotFoundError('One or more vendors not found');
            }

            vendors.forEach(checkDeletedAt);
        }

        if (linkedGc && linkedGc.length > 0) {
            const gcs = await prisma.generalContractor.findMany({
                where: {
                    id: { in: linkedGc.map((g) => g.id) },
                    deletedAt: null,
                },
            });

            if (gcs.length !== linkedGc.length) {
                throw new NotFoundError('One or more general contractors not found');
            }

            gcs.forEach(checkDeletedAt);
        }

        return await prisma.contact.create({
            data: {
                id: ulid(),
                fullName,
                professionalRoleId: professionalRoleId ?? null,
                email: email ?? undefined,
                phoneNumber: phoneNumber ?? undefined,
                tags: tags ?? [],
                vendorLinks: linkedVendors?.length
                    ? {
                          create: linkedVendors.map((v) => ({
                              id: ulid(),
                              vendorId: v.id,
                              isPrimary: v.isPrimary,
                          })),
                      }
                    : undefined,
                gcLinks: linkedGc?.length
                    ? {
                          create: linkedGc.map((g) => ({
                              id: ulid(),
                              generalContractorId: g.id,
                              isPrimary: g.isPrimary,
                          })),
                      }
                    : undefined,
            },
        });
    },

    getContact: async (id: string): Promise<Contact> => {
        const contact = await prisma.contact.findUnique({
            where: { id },
            include: {
                professionalRole: true,
                vendorLinks: { include: { vendor: true } },
                gcLinks: { include: { generalContractor: true } },
            },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        return contact;
    },

    getContacts: async (
        params: PaginationParams
    ): Promise<{
        data: Contact[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder } = params;
        const { search, professionalRoleId, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(professionalRoleId && { professionalRoleId }),
            ...(search && {
                OR: [{ fullName: { contains: search, mode: 'insensitive' as const } }],
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
                include: {
                    professionalRole: true,
                },
            }),
        ]);

        return { data, count };
    },

    updateContact: async (request: ContactUpdateRequest): Promise<Contact> => {
        const {
            id,
            professionalRoleId,
            linkedGc,
            linkedVendors,
            email,
            phoneNumber,
            tags,
            fullName,
        } = request;

        const contact = await prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        if (professionalRoleId) {
            const professionalRole = await prisma.lookup.findUnique({
                where: { id: professionalRoleId },
            });

            if (!professionalRole) {
                throw new NotFoundError('Professional role not found');
            }
        }

        if (linkedVendors && linkedVendors.length > 0) {
            const vendors = await prisma.vendor.findMany({
                where: {
                    id: { in: linkedVendors.map((v) => v.id) },
                    deletedAt: null,
                },
            });

            if (vendors.length !== linkedVendors.length) {
                throw new NotFoundError('One or more vendors not found');
            }

            vendors.forEach(checkDeletedAt);
        }

        if (linkedGc && linkedGc.length > 0) {
            const gcs = await prisma.generalContractor.findMany({
                where: {
                    id: { in: linkedGc.map((g) => g.id) },
                    deletedAt: null,
                },
            });

            if (gcs.length !== linkedGc.length) {
                throw new NotFoundError('One or more general contractors not found');
            }

            gcs.forEach(checkDeletedAt);
        }

        return await prisma.$transaction(async (tx) => {
            await tx.contactVendor.deleteMany({ where: { contactId: id } });
            await tx.contactGC.deleteMany({ where: { contactId: id } });

            return await tx.contact.update({
                where: { id },
                data: {
                    fullName,
                    professionalRoleId: professionalRoleId ?? null,
                    email: email ?? undefined,
                    phoneNumber: phoneNumber ?? undefined,
                    tags: tags ?? [],
                    ...(linkedVendors?.length && {
                        vendorLinks: {
                            create: linkedVendors.map((v) => ({
                                id: ulid(),
                                vendorId: v.id,
                                isPrimary: v.isPrimary,
                            })),
                        },
                    }),
                    ...(linkedGc?.length && {
                        gcLinks: {
                            create: linkedGc.map((g) => ({
                                id: ulid(),
                                generalContractorId: g.id,
                                isPrimary: g.isPrimary,
                            })),
                        },
                    }),
                },
            });
        });
    },

    addGcToContact: async (request: AddGcToContactRequest): Promise<ContactGC> => {
        const { contactId, generalContractorId, isPrimary } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        const gc = await prisma.generalContractor.findUnique({
            where: { id: generalContractorId },
        });

        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }

        checkDeletedAt(gc);

        const existing = await prisma.contactGC.findUnique({
            where: {
                contactId_generalContractorId: { contactId, generalContractorId },
            },
        });

        if (existing) {
            throw new ConflictError('Contact is already linked to this general contractor');
        }

        return await prisma.contactGC.create({
            data: {
                id: ulid(),
                contactId,
                generalContractorId,
                isPrimary,
            },
        });
    },

    removeGcFromContact: async (request: RemoveGcFromContactRequest): Promise<void> => {
        const { contactId, generalContractorId } = request;

        const link = await prisma.contactGC.findUnique({
            where: {
                contactId_generalContractorId: { contactId, generalContractorId },
            },
        });

        if (!link) {
            throw new NotFoundError('Contact is not linked to this general contractor');
        }

        await prisma.contactGC.delete({
            where: { id: link.id },
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
            data: { deletedAt: new Date() },
        });
    },

    addVendorToContact: async (request: AddVendorToContactRequest): Promise<ContactVendor> => {
        const { contactId, vendorId, isPrimary } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        const existing = await prisma.contactVendor.findUnique({
            where: {
                contactId_vendorId: { contactId, vendorId },
            },
        });

        if (existing) {
            throw new ConflictError('Contact is already linked to this vendor');
        }

        return await prisma.contactVendor.create({
            data: {
                id: ulid(),
                contactId,
                vendorId,
                isPrimary,
            },
        });
    },

    removeVendorFromContact: async (request: RemoveVendorFromContactRequest): Promise<void> => {
        const { contactId, vendorId } = request;

        const link = await prisma.contactVendor.findUnique({
            where: {
                contactId_vendorId: { contactId, vendorId },
            },
        });

        if (!link) {
            throw new NotFoundError('Contact is not linked to this vendor');
        }

        await prisma.contactVendor.delete({
            where: { id: link.id },
        });
    },

    addEmailToContact: async (request: AddEmailToContactRequest): Promise<Contact> => {
        const { contactId, email } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        const existing = (contact.email as ContactEmail[] | null) ?? [];

        if (existing.some((e) => e.email === email.email)) {
            throw new ConflictError('Email already exists on this contact');
        }

        const next = email.isPrimary
            ? [...existing.map((e) => ({ ...e, isPrimary: false })), email]
            : [...existing, email];

        return await prisma.contact.update({
            where: { id: contactId },
            data: { email: next },
        });
    },

    removeEmailFromContact: async (request: RemoveEmailFromContactRequest): Promise<Contact> => {
        const { contactId, email } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        const existing = (contact.email as ContactEmail[] | null) ?? [];
        const next = existing.filter((e) => e.email !== email);

        if (next.length === existing.length) {
            throw new NotFoundError('Email not found on this contact');
        }

        return await prisma.contact.update({
            where: { id: contactId },
            data: { email: next },
        });
    },

    addPhoneToContact: async (request: AddPhoneToContactRequest): Promise<Contact> => {
        const { contactId, phone } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        const existing = (contact.phoneNumber as ContactPhone[] | null) ?? [];

        if (existing.some((p) => p.number === phone.number)) {
            throw new ConflictError('Phone number already exists on this contact');
        }

        const next = phone.isPrimary
            ? [...existing.map((p) => ({ ...p, isPrimary: false })), phone]
            : [...existing, phone];

        return await prisma.contact.update({
            where: { id: contactId },
            data: { phoneNumber: next },
        });
    },

    removePhoneFromContact: async (request: RemovePhoneFromContactRequest): Promise<Contact> => {
        const { contactId, number } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        const existing = (contact.phoneNumber as ContactPhone[] | null) ?? [];
        const next = existing.filter((p) => p.number !== number);

        if (next.length === existing.length) {
            throw new NotFoundError('Phone number not found on this contact');
        }

        return await prisma.contact.update({
            where: { id: contactId },
            data: { phoneNumber: next },
        });
    },

    addTagToContact: async (request: AddTagToContactRequest): Promise<Contact> => {
        const { contactId, tag } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        if (contact.tags.includes(tag)) {
            throw new ConflictError('Tag already exists on this contact');
        }

        return await prisma.contact.update({
            where: { id: contactId },
            data: { tags: [...contact.tags, tag] },
        });
    },

    removeTagFromContact: async (request: RemoveTagFromContactRequest): Promise<Contact> => {
        const { contactId, tag } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        if (!contact.tags.includes(tag)) {
            throw new NotFoundError('Tag not found on this contact');
        }

        return await prisma.contact.update({
            where: { id: contactId },
            data: { tags: contact.tags.filter((t) => t !== tag) },
        });
    },
};
