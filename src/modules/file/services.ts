import { File } from '@db/client';
import { prisma } from '@lib/prisma';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import { FileUploadRequest, FolderCreateRequest } from './models';

export const FileService = {
    createFolder: async (request: FolderCreateRequest, userId: string): Promise<File> => {
        if (request.name === 'root') throw new BadRequestError("Cannot name folder 'root'");

        const f = await prisma.$transaction(async (tx) => {
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
        await prisma.file.create({
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
        const access = await prisma.fileAccess.findUnique({
            where: {
                fileId_userId: {
                    fileId: id,
                    userId,
                },
            },
        });

        if (!access || !access.permissions.includes('DELETE'))
            throw new BadRequestError('You are not permitted to delete this file.');

        const f = await prisma.file.findUnique({
            where: { id },
            include: { children: true },
        });

        if (!f) throw new NotFoundError('No file or folder found with id: ' + id);

        if (f.type === 'FOLDER') {
            if (f.children.length > 0)
                throw new BadRequestError('Cannot delete a folder with items in it.');

            if (!f.isDeletable) throw new BadRequestError('Cannot delete this file / folder.');

            await prisma.file.update({
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
};
