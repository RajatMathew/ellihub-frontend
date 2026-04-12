import { File } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma as prismaClient } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { UserService } from '@modules/user/services';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import { FileFolderRenameRequest, FileUploadRequest, FolderCreateRequest } from './models';

export const FileService = {
    protectedFolderNames: [
        'root',
        'projects',
        'project',
        'rfq',
        'purchase order',
        'purchase order co',
        'prime co',
        'prime contract',
        'invoice',
        'temp',
        'vendor',
        'employees',
        'gc',
    ],

    createFolder: async (request: FolderCreateRequest, userId: string): Promise<File> => {
        if (FileService.protectedFolderNames.includes(request.name.toLowerCase()))
            throw new BadRequestError(`Cannot name folder '${request.name}'`);

        const f = await prismaClient.$transaction(async (tx) => {
            const file = await tx.file.create({
                data: {
                    id: ulid(),
                    name: request.name,
                    parentId: request.parentId,
                    type: 'FOLDER',
                    createdBy: userId,
                },
            });

            // const users = await tx.user.findMany({ select: { id: true } });

            // const usersWithoutCreator = users.filter((u) => u.id !== userId).map((i) => i.id);

            // await tx.fileAccess.create({
            //     data: {
            //         fileId: file.id,
            //         userId,
            //         permissions: ['CHANGE_PERMISSION', 'ACCESS', 'CREATE_FILE_WITHIN', 'DELETE'],
            //     },
            // });

            // usersWithoutCreator.forEach(async (uId) => {
            //     await tx.fileAccess.create({
            //         data: {
            //             fileId: file.id,
            //             userId: uId,
            //             permissions: ['ACCESS'],
            //         },
            //     });
            // });

            return file;
        });

        return f;
    },

    uploadFile: async (request: FileUploadRequest, objectId: string, userId: string) => {
        await prismaClient.file.create({
            data: {
                ...request,
                id: objectId,
                type: 'FILE',
                createdBy: userId,
                objectId,
            },
        });
    },

    delete: async (id: string, userId: string) => {
        const access = await prismaClient.fileAccess.findUnique({
            where: {
                fileId_userId: {
                    fileId: id,
                    userId,
                },
            },
        });

        if (!access || !access.permissions.includes('DELETE'))
            throw new BadRequestError('You are not permitted to delete this file.');

        const f = await prismaClient.file.findUnique({
            where: { id },
            include: { children: true },
        });

        if (!f) throw new NotFoundError('No file or folder found with id: ' + id);

        if (f.type === 'FOLDER') {
            if (f.children.length > 0)
                throw new BadRequestError('Cannot delete a folder with items in it.');

            if (!f.isDeletable) throw new BadRequestError('Cannot delete this file / folder.');

            await prismaClient.file.update({
                where: {
                    id,
                },
                data: {
                    deletedAt: new Date(),
                    deletedBy: userId,
                },
            });
        }
    },

    createProjectFolders: async (
        tx: TransactionClient,
        projectId: string,
        displayName: string,
        userId: string
    ): Promise<void> => {
        const projectsRootFolder = await FileService.getRootFolder('projects', tx);

        const subFolders: {
            name: string;
            displayName: string;
            protectedFolderType:
                | 'INVOICE'
                | 'RFQ'
                | 'PURCHASE_ORDER'
                | 'PURCHASE_ORDER_CO'
                | 'PRIME_CO'
                | 'PRIME_CONTRACT';
        }[] = [
            { name: 'invoice', displayName: 'Invoice', protectedFolderType: 'INVOICE' },
            { name: 'rfq', displayName: 'RFQ', protectedFolderType: 'RFQ' },
            {
                name: 'purchase order',
                displayName: 'Purchase Order',
                protectedFolderType: 'PURCHASE_ORDER',
            },
            {
                name: 'purchase order co',
                displayName: 'Purchase Order CO',
                protectedFolderType: 'PURCHASE_ORDER_CO',
            },
            { name: 'prime co', displayName: 'Prime CO', protectedFolderType: 'PRIME_CO' },
            {
                name: 'prime contract',
                displayName: 'Prime Contract',
                protectedFolderType: 'PRIME_CONTRACT',
            },
        ];

        const projectFolder = await tx.file.create({
            data: {
                id: ulid(),
                name: projectId,
                displayName,
                type: 'FOLDER',
                createdBy: userId,
                isDeletable: false,
                parentId: projectsRootFolder.id,
                protectedFolderType: 'PROJECT_ROOT',
            },
        });

        for (const sf of subFolders) {
            await tx.file.create({
                data: {
                    id: ulid(),
                    name: sf.name,
                    displayName: sf.displayName,
                    type: 'FOLDER',
                    createdBy: userId,
                    isDeletable: false,
                    parentId: projectFolder.id,
                    protectedFolderType: sf.protectedFolderType,
                },
            });
        }
    },

    createGcFolder: async (
        tx: TransactionClient,
        gcId: string,
        displayName: string,
        userId: string
    ): Promise<void> => {
        const gcRootFolder = await FileService.getRootFolder('gc', tx);

        await tx.file.create({
            data: {
                id: ulid(),
                name: gcId,
                displayName,
                type: 'FOLDER',
                createdBy: userId,
                isDeletable: false,
                parentId: gcRootFolder.id,
            },
        });
    },

    createVendorFolder: async (
        tx: TransactionClient,
        vendorId: string,
        displayName: string,
        userId: string
    ): Promise<void> => {
        const vendorRootFolder = await FileService.getRootFolder('vendor', tx);

        await tx.file.create({
            data: {
                id: ulid(),
                name: vendorId,
                displayName,
                type: 'FOLDER',
                createdBy: userId,
                isDeletable: false,
                parentId: vendorRootFolder.id,
            },
        });
    },

    createEmployeeFolder: async (
        tx: TransactionClient,
        employeeId: string,
        displayName: string,
        userId: string
    ): Promise<void> => {
        const employeesRootFolder = await FileService.getRootFolder('employees', tx);

        await tx.file.create({
            data: {
                id: ulid(),
                name: employeeId,
                displayName,
                type: 'FOLDER',
                createdBy: userId,
                isDeletable: false,
                parentId: employeesRootFolder.id,
            },
        });
    },

    getProjectFolderId: async (projectId: string, tx?: TransactionClient): Promise<string> => {
        const prisma = tx || prismaClient;

        const projectFolder = await prisma.file.findFirst({
            where: {
                name: projectId,
                protectedFolderType: 'PROJECT_ROOT',
            },
            select: { id: true },
        });

        if (!projectFolder)
            throw new NotFoundError(`Project folder not found for project: ${projectId}`);

        return projectFolder.id;
    },

    getProjectSubFolderId: async (
        projectId: string,
        type:
            | 'INVOICE'
            | 'RFQ'
            | 'PURCHASE_ORDER'
            | 'PURCHASE_ORDER_CO'
            | 'PRIME_CO'
            | 'PRIME_CONTRACT',
        tx?: TransactionClient
    ): Promise<string> => {
        const prisma = tx || prismaClient;

        const projectFolderId = await FileService.getProjectFolderId(projectId, tx);

        const subFolder = await prisma.file.findFirst({
            where: {
                parentId: projectFolderId,
                protectedFolderType: type,
            },
            select: { id: true },
        });

        if (!subFolder)
            throw new NotFoundError(
                `Project sub-folder '${type}' not found for project: ${projectId}`
            );

        return subFolder.id;
    },

    getRootFolder: async (
        folder: 'root' | 'projects' | 'employees' | 'gc' | 'vendor' | 'temp',
        tx?: TransactionClient
    ): Promise<File> => {
        const prisma = tx || prismaClient;

        const rootFolder = await prisma.file.findFirst({
            where: {
                name: {
                    equals: 'root',
                    mode: 'insensitive',
                },

                parentId: null,
            },
        });

        if (!rootFolder) throw new NotFoundError('Root folder not found.');

        if (folder === 'root') return rootFolder;

        const subFolder = await prisma.file.findFirst({
            where: {
                name: {
                    equals: folder,
                    mode: 'insensitive',
                },

                parentId: rootFolder.id,
            },
        });

        if (!subFolder) throw new NotFoundError(`${folder} folder not found.`);

        return subFolder;
    },

    getTempFolderId: async (tx?: TransactionClient): Promise<string> => {
        const tempFolder = await FileService.getRootFolder('temp', tx);
        return tempFolder.id;
    },

    getFolderDetails: async (id: string): Promise<File> => {
        const folder = await prismaClient.file.findUnique({
            where: { id },
            include: { children: { where: { deletedAt: null } } },
        });

        checkDeletedAt(folder);

        if (!folder || folder.type !== 'FOLDER')
            throw new NotFoundError('No folder found with id: ' + id);

        return folder;
    },

    rename: async (request: FileFolderRenameRequest): Promise<File> => {
        const file = await prismaClient.file.findUnique({
            where: { id: request.id },
        });

        if (!file) throw new NotFoundError('No file or folder found with id: ' + request.id);

        checkDeletedAt(file);

        if (!file.isDeletable)
            throw new BadRequestError(
                'Cannot rename this file / folder because it is protected or non-deletable.'
            );

        return await prismaClient.file.update({
            where: { id: request.id },
            data: {
                name: request.name,
            },
        });
    },

    deleteFolder: async (id: string, userId: string): Promise<void> => {
        const folder = await prismaClient.file.findUnique({
            where: { id },
            include: { children: true },
        });

        if (!folder || folder.type !== 'FOLDER')
            throw new NotFoundError('No folder found with id: ' + id);

        checkDeletedAt(folder);

        if (!folder.isDeletable) throw new BadRequestError('Cannot delete this folder.');

        if (folder.children.length > 0)
            throw new BadRequestError('Cannot delete a folder with items in it.');

        const user = await prismaClient.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new NotFoundError('No user found with id: ' + userId);

        await prismaClient.file.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: userId,
            },
        });
    },

    getBreadcrumbs: async (folderId: string): Promise<{ id: string; name: string }[]> => {
        const breadcrumbs: { id: string; name: string }[] = [];
        let currentId: string | null = folderId;

        while (currentId) {
            const folder: { id: string; name: string; parentId: string | null } | null =
                await prismaClient.file.findUnique({
                    where: { id: currentId! },
                    select: { id: true, name: true, parentId: true },
                });

            if (!folder) break;

            breadcrumbs.unshift({ id: folder.id, name: folder.name });
            currentId = folder.parentId;
        }

        return breadcrumbs;
    },

    searchFiles: async (params: PaginationParams): Promise<{ data: File[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const {
            search: filterSearch,
            type,
            mimeType,
            parentId,
            createdBy,
            createdFrom,
            createdTo,
            ...restFilter
        } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(type && { type }),
            ...(mimeType && { mimeType: { contains: mimeType, mode: 'insensitive' as const } }),
            ...(parentId && { parentId }),
            ...(createdBy && { createdBy }),
            ...(search && {
                name: { contains: search, mode: 'insensitive' as const },
            }),
            ...((createdFrom || createdTo) && {
                createdAt: {
                    ...(createdFrom && { gte: new Date(createdFrom) }),
                    ...(createdTo && { lte: new Date(createdTo) }),
                },
            }),
        };

        const [count, data] = await prismaClient.$transaction([
            prismaClient.file.count({ where: whereClause }),
            prismaClient.file.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof File]: sortOrder },
            }),
        ]);

        return { data, count };
    },

    deleteFile: async (id: string, userId: string): Promise<void> => {
        const file = await prismaClient.file.findUnique({
            where: { id },
        });

        if (!file) throw new NotFoundError('No file found with id: ' + id);

        checkDeletedAt(file);

        if (!file.isDeletable) throw new BadRequestError('Cannot delete this file.');

        if (!UserService.getUser(userId))
            throw new NotFoundError('No user found with id: ' + userId);

        await prismaClient.file.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: userId,
            },
        });
    },
};
