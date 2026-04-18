import { Contact } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
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
    LinkContactRequest,
    RemoveEmailFromContactRequest,
    RemovePhoneFromContactRequest,
    RemoveTagFromContactRequest,
    UnlinkContactRequest,
} from './models';

export const ContactService = {
    createContact: async (request: ContactCreateRequest, userId: string): Promise<Contact> => {
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

        const created = await prisma.contact.create({
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

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: created.id,
            action: 'create',
            description: `Created contact ${created.fullName}`,
        });

        return created;
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

    updateContact: async (request: ContactUpdateRequest, userId: string): Promise<Contact> => {
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

        const updated = await prisma.contact.update({
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

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: updated.id,
            action: 'update',
            description: `Updated contact ${updated.fullName}`,
        });

        return updated;
    },

    deleteContact: async (id: string, userId: string): Promise<void> => {
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

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: id,
            action: 'delete',
            description: `Deleted contact ${contact.fullName}`,
        });
    },

    addEmailToContact: async (
        request: AddEmailToContactRequest,
        userId: string
    ): Promise<Contact> => {
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

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { email: next },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'addEmail',
            description: `Added email ${email.email} to contact ${contact.fullName}`,
        });

        return updated;
    },

    removeEmailFromContact: async (
        request: RemoveEmailFromContactRequest,
        userId: string
    ): Promise<Contact> => {
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

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { email: next },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'removeEmail',
            description: `Removed email ${email} from contact ${contact.fullName}`,
        });

        return updated;
    },

    addPhoneToContact: async (
        request: AddPhoneToContactRequest,
        userId: string
    ): Promise<Contact> => {
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

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { phoneNumber: next },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'addPhone',
            description: `Added phone ${phone.number} to contact ${contact.fullName}`,
        });

        return updated;
    },

    removePhoneFromContact: async (
        request: RemovePhoneFromContactRequest,
        userId: string
    ): Promise<Contact> => {
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

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { phoneNumber: next },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'removePhone',
            description: `Removed phone ${number} from contact ${contact.fullName}`,
        });

        return updated;
    },

    addTagToContact: async (request: AddTagToContactRequest, userId: string): Promise<Contact> => {
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

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { tags: [...contact.tags, tag] },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'addTag',
            description: `Added tag '${tag}' to contact ${contact.fullName}`,
        });

        return updated;
    },

    removeTagFromContact: async (
        request: RemoveTagFromContactRequest,
        userId: string
    ): Promise<Contact> => {
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

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { tags: contact.tags.filter((t) => t !== tag) },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'removeTag',
            description: `Removed tag '${tag}' from contact ${contact.fullName}`,
        });

        return updated;
    },

    linkContact: async (request: LinkContactRequest, userId: string): Promise<Contact> => {
        const { contactId, vendorId, generalContractorId } = request;

        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        if (!contact) throw new NotFoundError('Contact not found');
        checkDeletedAt(contact);

        let targetLabel: string;
        if (vendorId) {
            const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundError('Vendor not found');
            checkDeletedAt(vendor);
            targetLabel = `vendor ${vendor.name}`;
        } else {
            const gc = await prisma.generalContractor.findUnique({
                where: { id: generalContractorId! },
            });
            if (!gc) throw new NotFoundError('General contractor not found');
            checkDeletedAt(gc);
            targetLabel = `GC ${gc.name}`;
        }

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: {
                vendorId: vendorId ?? null,
                generalContractorId: generalContractorId ?? null,
            },
            include: {
                professionalRole: true,
                vendor: true,
                generalContractor: true,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'link',
            description: `Linked contact ${contact.fullName} to ${targetLabel}`,
        });

        return updated;
    },

    unlinkContact: async (request: UnlinkContactRequest, userId: string): Promise<Contact> => {
        const { contactId } = request;

        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        if (!contact) throw new NotFoundError('Contact not found');
        checkDeletedAt(contact);

        if (!contact.vendorId && !contact.generalContractorId) {
            throw new NotFoundError('Contact is not linked to a vendor or GC');
        }

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { vendorId: null, generalContractorId: null },
            include: {
                professionalRole: true,
                vendor: true,
                generalContractor: true,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'unlink',
            description: `Unlinked contact ${contact.fullName} from vendor/GC`,
        });

        return updated;
    },
};
