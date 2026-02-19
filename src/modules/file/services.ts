import { File } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma as prismaClient } from '@lib/prisma';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { FileUploadRequest, FolderCreateRequest } from './models';

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
        userId: string
    ): Promise<void> => {
        const projectsRootFolder = await FileService.getRootFolder('projects', tx);

        const subFolders = [
            'invoice',
            'rfq',
            'purchase order',
            'purchase order co',
            'prime co',
            'prime contract',
        ];

        const projectFolder = await tx.file.create({
            data: {
                id: ulid(),
                name: projectId,
                type: 'FOLDER',
                createdBy: userId,
                isDeletable: false,
                parentId: projectsRootFolder.id,
            },
        });

        for (const sf of subFolders) {
            await tx.file.create({
                data: {
                    id: ulid(),
                    name: sf,
                    type: 'FOLDER',
                    createdBy: userId,
                    isDeletable: false,
                    parentId: projectFolder.id,
                },
            });
        }
    },

    getRootFolder: async (
        folder: 'root' | 'projects' | 'employees' | 'gc',
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

    getFolderDetails: async (id: string) => {
        const folder = await prismaClient.file.findUnique({
            where: { id },
            include: { children: true },
        });
    },
};
