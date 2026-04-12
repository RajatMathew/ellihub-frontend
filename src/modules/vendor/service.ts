import { Vendor, VendorDocument } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { FileService } from '@modules/file/services';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddVendorDocumentRequest,
    RemoveVendorDocumentRequest,
    UpdateVendorDocumentRequest,
    VendorCreateRequest,
    VendorUpdateRequest,
} from './models';

export const VendorService = {
    createVendor: async (request: VendorCreateRequest, userId: string): Promise<Vendor> => {
        const { typeId, contacts, ...rest } = request;

        if (typeId) {
            const type = await prisma.lookup.findUnique({ where: { id: typeId } });
            if (!type) throw new NotFoundError('Vendor type not found');
        }

        if (contacts?.length) {
            const found = await prisma.contact.findMany({
                where: { id: { in: contacts.map((c) => c.contactId) }, deletedAt: null },
            });
            if (found.length !== contacts.length) {
                throw new NotFoundError('One or more contacts not found');
            }
            found.forEach(checkDeletedAt);
        }

        return await prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.create({
                data: { ...rest, id: ulid(), typeId: typeId ?? null },
            });

            if (contacts?.length) {
                await tx.contactVendor.createMany({
                    data: contacts.map((c) => ({
                        id: ulid(),
                        vendorId: vendor.id,
                        contactId: c.contactId,
                        isPrimary: c.isPrimary,
                    })),
                });
            }

            await FileService.createVendorFolder(tx, vendor.id, request.name, userId);

            return vendor;
        });
    },

    getVendor: async (id: string): Promise<Vendor> => {
        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: {
                type: true,
                contactLinks: { include: { contact: true } },
            },
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        return vendor;
    },

    updateVendor: async (request: VendorUpdateRequest): Promise<Vendor> => {
        const { id, typeId, contacts, ...rest } = request;

        const vendor = await prisma.vendor.findUnique({ where: { id } });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        if (typeId) {
            const type = await prisma.lookup.findUnique({ where: { id: typeId } });
            if (!type) throw new NotFoundError('Vendor type not found');
        }

        if (contacts?.length) {
            const found = await prisma.contact.findMany({
                where: { id: { in: contacts.map((c) => c.contactId) }, deletedAt: null },
            });
            if (found.length !== contacts.length) {
                throw new NotFoundError('One or more contacts not found');
            }
            found.forEach(checkDeletedAt);
        }

        return await prisma.$transaction(async (tx) => {
            await tx.contactVendor.deleteMany({ where: { vendorId: id } });

            const updated = await tx.vendor.update({
                where: { id },
                data: { ...rest, typeId: typeId ?? null },
            });

            if (contacts?.length) {
                await tx.contactVendor.createMany({
                    data: contacts.map((c) => ({
                        id: ulid(),
                        vendorId: id,
                        contactId: c.contactId,
                        isPrimary: c.isPrimary,
                    })),
                });
            }

            return updated;
        });
    },

    deleteVendor: async (id: string): Promise<void> => {
        const vendor = await prisma.vendor.findUnique({ where: { id } });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        await prisma.vendor.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },

    addDocumentToVendor: async (request: AddVendorDocumentRequest): Promise<VendorDocument> => {
        const { vendorId, fileId, expiresOn } = request;

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }
        checkDeletedAt(vendor);

        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file) {
            throw new NotFoundError('File not found');
        }
        checkDeletedAt(file);

        const existing = await prisma.vendorDocument.findUnique({
            where: { vendorId_fileId: { vendorId, fileId } },
        });
        if (existing) {
            throw new ConflictError('Document already linked to this vendor');
        }

        return await prisma.vendorDocument.create({
            data: {
                id: ulid(),
                vendorId,
                fileId,
                expiresOn: expiresOn ? new Date(expiresOn) : null,
            },
        });
    },

    updateVendorDocument: async (request: UpdateVendorDocumentRequest): Promise<VendorDocument> => {
        const { vendorId, fileId, expiresOn } = request;

        const document = await prisma.vendorDocument.findUnique({
            where: { vendorId_fileId: { vendorId, fileId } },
        });
        if (!document) {
            throw new NotFoundError('Vendor document not found');
        }

        return await prisma.vendorDocument.update({
            where: { id: document.id },
            data: { expiresOn: expiresOn ? new Date(expiresOn) : null },
        });
    },

    removeDocumentFromVendor: async (request: RemoveVendorDocumentRequest): Promise<void> => {
        const { vendorId, fileId } = request;

        const document = await prisma.vendorDocument.findUnique({
            where: { vendorId_fileId: { vendorId, fileId } },
        });
        if (!document) {
            throw new NotFoundError('Vendor document not found');
        }

        await prisma.vendorDocument.delete({ where: { id: document.id } });
    },

    getVendors: async (
        params: PaginationParams
    ): Promise<{
        data: Vendor[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { typeId, status, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(typeId && { typeId }),
            ...(status && { status }),
            ...(search && {
                OR: [{ name: { contains: search, mode: 'insensitive' as const } }],
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
                    type: true,
                },
            }),
        ]);

        return { data, count };
    },
};
