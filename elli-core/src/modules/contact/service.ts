import { Contact } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddTagToContactRequest,
    ContactCreateRequest,
    ContactUpdateRequest,
    LinkContactRequest,
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
                email,
                phoneNumber: phoneNumber ?? null,
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
            affectedEntityIds: [vendorId, generalContractorId].filter((v): v is string => !!v),
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
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phoneNumber: { contains: search, mode: 'insensitive' as const } },
                ],
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

    searchUnlinkedContacts: async (
        search?: string
    ): Promise<{ id: string; fullName: string }[]> => {
        return prisma.contact.findMany({
            where: {
                deletedAt: null,
                vendorId: null,
                generalContractorId: null,
                ...(search && {
                    fullName: { contains: search, mode: 'insensitive' as const },
                }),
            },
            select: { id: true, fullName: true },
            orderBy: { fullName: 'asc' },
            take: 25,
        });
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
                email,
                phoneNumber: phoneNumber ?? null,
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
            affectedEntityIds: [
                updated.vendorId,
                updated.generalContractorId,
                contact.vendorId !== updated.vendorId ? contact.vendorId : null,
                contact.generalContractorId !== updated.generalContractorId
                    ? contact.generalContractorId
                    : null,
            ].filter((v): v is string => !!v),
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
            affectedEntityIds: [vendorId, generalContractorId].filter((v): v is string => !!v),
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
            affectedEntityIds: [contact.vendorId, contact.generalContractorId].filter(
                (v): v is string => !!v
            ),
        });

        return updated;
    },
};
