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
        const { typeId, ...rest } = request;

        if (typeId) {
            const type = await prisma.lookup.findUnique({ where: { id: typeId } });
            if (!type) throw new NotFoundError('Vendor type not found');
        }

        return await prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.create({
                data: { ...rest, id: ulid(), typeId: typeId ?? null },
            });

            await FileService.createVendorFolder(tx, vendor.id, request.name, userId);

            return vendor;
        });
    },

    getVendor: async (id: string): Promise<Vendor> => {
        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: {
                type: true,
                contacts: true,
            },
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        return vendor;
    },

    updateVendor: async (request: VendorUpdateRequest): Promise<Vendor> => {
        const { id, typeId, ...rest } = request;

        const vendor = await prisma.vendor.findUnique({ where: { id } });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        if (typeId) {
            const type = await prisma.lookup.findUnique({ where: { id: typeId } });
            if (!type) throw new NotFoundError('Vendor type not found');
        }

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.vendor.update({
                where: { id },
                data: { ...rest, typeId: typeId ?? null },
            });

            if (request.name !== vendor.name) {
                const folderId = await FileService.getVendorFolderId(id, tx);
                await FileService.updateFolderDisplayName(folderId, request.name, tx);
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

        return await prisma.$transaction(async (tx) => {
            const vendorFolderId = await FileService.getVendorFolderId(vendorId, tx);
            await FileService.moveFileToFolder(fileId, vendorFolderId, tx);

            return await tx.vendorDocument.create({
                data: {
                    id: ulid(),
                    vendorId,
                    fileId,
                    expiresOn: expiresOn ? new Date(expiresOn) : null,
                },
            });
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
                    contacts: true,
                },
            }),
        ]);

        return { data, count };
    },
};
