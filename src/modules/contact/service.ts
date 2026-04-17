import { Contact } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddEmailToContactRequest,
    AddPhoneToContactRequest,
    AddTagToContactRequest,
    ContactCreateRequest,
    ContactEmail,
    ContactPhone,
    ContactUpdateRequest,
    RemoveEmailFromContactRequest,
    RemovePhoneFromContactRequest,
    RemoveTagFromContactRequest,
} from './models';

export const ContactService = {
    createContact: async (request: ContactCreateRequest): Promise<Contact> => {
        const {
            professionalRoleId,
            vendorId,
            generalContractorId,
            email,
            phoneNumber,
            tags,
            fullName,
        } = request;

        if (professionalRoleId) {
            const professionalRole = await prisma.lookup.findUnique({
                where: { id: professionalRoleId },
            });

            if (!professionalRole) {
                throw new NotFoundError('Professional role not found');
            }
        }

        if (vendorId) {
            const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundError('Vendor not found');
            checkDeletedAt(vendor);
        }

        if (generalContractorId) {
            const gc = await prisma.generalContractor.findUnique({
                where: { id: generalContractorId },
            });
            if (!gc) throw new NotFoundError('General contractor not found');
            checkDeletedAt(gc);
        }

        return await prisma.contact.create({
            data: {
                id: ulid(),
                fullName,
                professionalRoleId: professionalRoleId ?? null,
                email: email ?? undefined,
                phoneNumber: phoneNumber ?? undefined,
                tags: tags ?? [],
                vendorId: vendorId ?? null,
                generalContractorId: generalContractorId ?? null,
            },
            include: {
                professionalRole: true,
                vendor: true,
                generalContractor: true,
            },
        });
    },

    getContact: async (id: string): Promise<Contact> => {
        const contact = await prisma.contact.findUnique({
            where: { id },
            include: {
                professionalRole: true,
                vendor: true,
                generalContractor: true,
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
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { professionalRoleId, ...restFilter } = filter || {};

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
                    vendor: true,
                    generalContractor: true,
                },
            }),
        ]);

        return { data, count };
    },

    updateContact: async (request: ContactUpdateRequest): Promise<Contact> => {
        const {
            id,
            professionalRoleId,
            vendorId,
            generalContractorId,
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

        if (vendorId) {
            const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundError('Vendor not found');
            checkDeletedAt(vendor);
        }

        if (generalContractorId) {
            const gc = await prisma.generalContractor.findUnique({
                where: { id: generalContractorId },
            });
            if (!gc) throw new NotFoundError('General contractor not found');
            checkDeletedAt(gc);
        }

        // Enforce exclusivity: setting one side clears the other so callers can flip in one call.
        let nextVendorId: string | null | undefined;
        let nextGcId: string | null | undefined;
        if (vendorId) {
            nextVendorId = vendorId;
            nextGcId = null;
        } else if (generalContractorId) {
            nextGcId = generalContractorId;
            nextVendorId = null;
        } else {
            nextVendorId = vendorId === null ? null : undefined;
            nextGcId = generalContractorId === null ? null : undefined;
        }

        return await prisma.contact.update({
            where: { id },
            data: {
                fullName,
                professionalRoleId: professionalRoleId ?? null,
                email: email ?? undefined,
                phoneNumber: phoneNumber ?? undefined,
                tags: tags ?? [],
                vendorId: nextVendorId,
                generalContractorId: nextGcId,
            },
            include: {
                professionalRole: true,
                vendor: true,
                generalContractor: true,
            },
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
