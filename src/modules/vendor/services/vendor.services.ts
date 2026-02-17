import { Vendor } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { checkDeletedAt } from '@modules/common/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ConflictError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    VendorContactAddRequest,
    VendorContactUpdateRequest,
    VendorCreateRequest,
    VendorUpdateRequest,
} from '../models/vendor.models';

const vendorIncludes = {
    contactLinks: {
        include: {
            contact: true,
        },
    },
} as const;

export const VendorService = {
    createVendor: async (data: VendorCreateRequest) => {
        const { contacts, ...vendorData } = data;

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
            const vendorId = ulid();

            await tx.vendor.create({
                data: {
                    id: vendorId,
                    name: vendorData.name,
                    type: vendorData.type,
                    categoryTags: vendorData.categoryTags,
                    taxId: vendorData.taxId,
                    status: vendorData.status,
                    address: vendorData.address,
                    email: vendorData.email,
                    phone: vendorData.phone,
                    website: vendorData.website,
                    paymentTerms: vendorData.paymentTerms,
                    notes: vendorData.notes,
                },
            });

            if (contacts.length > 0) {
                await tx.contactVendor.createMany({
                    data: contacts.map((link) => ({
                        id: ulid(),
                        contactId: link.contactId,
                        vendorId,
                        isPrimary: link.isPrimary ?? false,
                    })),
                });
            }

            return await tx.vendor.findUniqueOrThrow({
                where: { id: vendorId },
                include: vendorIncludes,
            });
        });
    },

    getVendors: async (
        params: PaginationParams
    ): Promise<{
        data: Vendor[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const { search: filterSearch, type, status, categoryTag, ...restFilter } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(type && { type }),
            ...(status && { status }),
            ...(categoryTag && {
                categoryTags: { has: categoryTag },
            }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.vendor.count({
                where: whereClause,
            }),

            prisma.vendor.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof Vendor]: sortOrder,
                },
                include: {
                    _count: {
                        select: { contactLinks: true },
                    },
                },
            }),
        ]);

        return { data, count };
    },

    getVendor: async (id: string) => {
        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: vendorIncludes,
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        return vendor;
    },

    updateVendor: async (id: string, data: VendorUpdateRequest) => {
        const vendor = await prisma.vendor.findUnique({
            where: { id },
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        return await prisma.vendor.update({
            where: { id },
            data,
            include: vendorIncludes,
        });
    },

    deleteVendor: async (id: string) => {
        const vendor = await prisma.vendor.findUnique({
            where: { id },
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        await prisma.vendor.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });
    },

    addContact: async (vendorId: string, data: VendorContactAddRequest) => {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        const contact = await prisma.contact.findUnique({
            where: { id: data.contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        try {
            return await prisma.contactVendor.create({
                data: {
                    id: ulid(),
                    contactId: data.contactId,
                    vendorId,
                    isPrimary: data.isPrimary,
                },
                include: {
                    contact: true,
                },
            });
        } catch (err) {
            if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new ConflictError('This contact is already linked to this vendor');
            }
            throw err;
        }
    },

    updateContact: async (vendorId: string, contactId: string, data: VendorContactUpdateRequest) => {
        const link = await prisma.contactVendor.findFirst({
            where: { vendorId, contactId },
        });

        if (!link) {
            throw new NotFoundError('Contact link not found');
        }

        return await prisma.contactVendor.update({
            where: { id: link.id },
            data: { isPrimary: data.isPrimary },
            include: {
                contact: true,
            },
        });
    },

    removeContact: async (vendorId: string, contactId: string) => {
        const link = await prisma.contactVendor.findFirst({
            where: { vendorId, contactId },
        });

        if (!link) {
            throw new NotFoundError('Contact link not found');
        }

        await prisma.contactVendor.delete({
            where: { id: link.id },
        });
    },
};
