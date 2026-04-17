import { GCDocument, GeneralContractor } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { FileService } from '@modules/file/services';
import { ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddGcDocumentRequest,
    GcCreateRequest,
    GcUpdateRequest,
    RemoveGcDocumentRequest,
    UpdateGcDocumentRequest,
} from './models';

export const GcService = {
    createGc: async (request: GcCreateRequest, userId: string): Promise<GeneralContractor> => {
        const { gcTypeId, ...rest } = request;

        const type = await prisma.lookup.findUnique({ where: { id: gcTypeId } });
        if (!type) throw new NotFoundError('GC type not found');

        return await prisma.$transaction(async (tx) => {
            const gc = await tx.generalContractor.create({
                data: { ...rest, id: ulid(), gcTypeId },
            });

            await FileService.createGcFolder(tx, gc.id, request.name, userId);

            return gc;
        });
    },

    getGc: async (id: string): Promise<GeneralContractor> => {
        const gc = await prisma.generalContractor.findUnique({
            where: { id },
            include: {
                gcType: true,
                contacts: true,
            },
        });

        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }

        checkDeletedAt(gc);

        return gc;
    },

    updateGc: async (request: GcUpdateRequest): Promise<GeneralContractor> => {
        const { id, gcTypeId, ...rest } = request;

        const gc = await prisma.generalContractor.findUnique({ where: { id } });

        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }

        checkDeletedAt(gc);

        const type = await prisma.lookup.findUnique({ where: { id: gcTypeId } });
        if (!type) throw new NotFoundError('GC type not found');

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.generalContractor.update({
                where: { id },
                data: { ...rest, gcTypeId },
            });

            if (request.name !== gc.name) {
                const folderId = await FileService.getGcFolderId(id, tx);
                await FileService.updateFolderDisplayName(folderId, request.name, tx);
            }

            return updated;
        });
    },

    deleteGc: async (id: string): Promise<void> => {
        const gc = await prisma.generalContractor.findUnique({ where: { id } });

        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }

        checkDeletedAt(gc);

        await prisma.generalContractor.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },

    addDocumentToGc: async (request: AddGcDocumentRequest): Promise<GCDocument> => {
        const { gcId, fileId, expiresOn } = request;

        const gc = await prisma.generalContractor.findUnique({ where: { id: gcId } });
        if (!gc) {
            throw new NotFoundError('General contractor not found');
        }
        checkDeletedAt(gc);

        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file) {
            throw new NotFoundError('File not found');
        }
        checkDeletedAt(file);

        const existing = await prisma.gCDocument.findUnique({
            where: { gcId_fileId: { gcId, fileId } },
        });
        if (existing) {
            throw new ConflictError('Document already linked to this general contractor');
        }

        return await prisma.$transaction(async (tx) => {
            const gcFolderId = await FileService.getGcFolderId(gcId, tx);
            await FileService.moveFileToFolder(fileId, gcFolderId, tx);

            return await tx.gCDocument.create({
                data: {
                    id: ulid(),
                    gcId,
                    fileId,
                    expiresOn: expiresOn ? new Date(expiresOn) : null,
                },
            });
        });
    },

    updateGcDocument: async (request: UpdateGcDocumentRequest): Promise<GCDocument> => {
        const { gcId, fileId, expiresOn } = request;

        const document = await prisma.gCDocument.findUnique({
            where: { gcId_fileId: { gcId, fileId } },
        });
        if (!document) {
            throw new NotFoundError('GC document not found');
        }

        return await prisma.gCDocument.update({
            where: { id: document.id },
            data: { expiresOn: expiresOn ? new Date(expiresOn) : null },
        });
    },

    removeDocumentFromGc: async (request: RemoveGcDocumentRequest): Promise<void> => {
        const { gcId, fileId } = request;

        const document = await prisma.gCDocument.findUnique({
            where: { gcId_fileId: { gcId, fileId } },
        });
        if (!document) {
            throw new NotFoundError('GC document not found');
        }

        await prisma.gCDocument.delete({ where: { id: document.id } });
    },

    getGcs: async (
        params: PaginationParams
    ): Promise<{
        data: GeneralContractor[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { gcTypeId, status, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(gcTypeId && { gcTypeId }),
            ...(status && { status }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                    { website: { contains: search, mode: 'insensitive' as const } },
                    { address: { contains: search, mode: 'insensitive' as const } },
                    { fax: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.generalContractor.count({
                where: whereClause,
            }),

            prisma.generalContractor.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof GeneralContractor]: sortOrder,
                },
                include: {
                    gcType: true,
                    contacts: true,
                },
            }),
        ]);

        return { data, count };
    },
};
