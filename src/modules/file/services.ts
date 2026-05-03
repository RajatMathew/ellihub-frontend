import { File, FileExportJob } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma as prismaClient } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { UserService } from '@modules/user/services';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import { FileFolderRenameRequest, FileUploadRequest, FolderCreateRequest } from './models';
import { s3Service } from './s3';
import { writeZipArchiveToSink, ZipStreamEntry } from './zip';

type FileContent = {
    file: File;
    fileName: string;
    mimeType: string;
    content: Uint8Array;
};

type FolderExportPlan = {
    entries: ZipStreamEntry[];
    fileName: string;
    totalFiles: number;
    totalBytes: string;
};

type FolderExportJobResponse = {
    id: string;
    folderId: string;
    status: FileExportJob['status'];
    fileName: string;
    totalFiles: number;
    processedFiles: number;
    totalBytes: string;
    processedBytes: string;
    error: string | null;
    downloadUrl?: string;
    expiresAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

const EXPORT_EXPIRES_IN_SECONDS = 24 * 60 * 60;
const EXPORT_OBJECT_PREFIX = 'exports';

function getDisplayFileName(file: File): string {
    return file.displayName || file.name || file.id;
}

function sanitizeZipSegment(value: string): string {
    const invalidCharacters = new Set(['<', '>', ':', '"', '\\', '|', '?', '*', '/']);
    const segment = Array.from(value)
        .map((character) =>
            invalidCharacters.has(character) || character.charCodeAt(0) < 32 ? '_' : character
        )
        .join('')
        .trim();

    return segment || 'item';
}

function ensureUniqueZipPath(path: string, usedPaths: Set<string>, directory = false): string {
    const normalizedPath = directory && !path.endsWith('/') ? `${path}/` : path;

    if (!usedPaths.has(normalizedPath)) {
        usedPaths.add(normalizedPath);
        return normalizedPath;
    }

    const trimmedPath = normalizedPath.replace(/\/$/, '');
    const separatorIndex = trimmedPath.lastIndexOf('/');
    const directoryPath = separatorIndex >= 0 ? `${trimmedPath.slice(0, separatorIndex + 1)}` : '';
    const fileName = separatorIndex >= 0 ? trimmedPath.slice(separatorIndex + 1) : trimmedPath;
    const extensionIndex = directory ? -1 : fileName.lastIndexOf('.');
    const baseName = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
    const extension = extensionIndex > 0 ? fileName.slice(extensionIndex) : '';
    let nextIndex = 2;

    while (true) {
        const candidate = `${directoryPath}${baseName} (${nextIndex})${extension}${directory ? '/' : ''}`;

        if (!usedPaths.has(candidate)) {
            usedPaths.add(candidate);
            return candidate;
        }

        nextIndex += 1;
    }
}

async function serializeExportJob(job: FileExportJob): Promise<FolderExportJobResponse> {
    const isCompleted = job.status === 'COMPLETED' && !!job.objectId && job.expiresAt > new Date();
    const downloadUrl = isCompleted
        ? await s3Service.getDownloadLink(job.objectId!, EXPORT_EXPIRES_IN_SECONDS)
        : undefined;

    return {
        id: job.id,
        folderId: job.folderId,
        status: isCompleted ? job.status : job.status === 'COMPLETED' ? 'EXPIRED' : job.status,
        fileName: job.fileName,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        totalBytes: job.totalBytes,
        processedBytes: job.processedBytes,
        error: job.error,
        downloadUrl,
        expiresAt: job.expiresAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
    };
}

async function buildFolderExportPlan(folder: File): Promise<FolderExportPlan> {
    const entries: ZipStreamEntry[] = [];
    const usedPaths = new Set<string>();
    const rootName = sanitizeZipSegment(getDisplayFileName(folder));
    let totalFiles = 0;
    let totalBytes = 0n;

    const collectEntries = async (currentFolder: File, currentPath: string): Promise<void> => {
        const folderPath = ensureUniqueZipPath(currentPath, usedPaths, true);
        entries.push({
            path: folderPath,
            directory: true,
            modifiedAt: currentFolder.updatedAt,
        });

        const children = await prismaClient.file.findMany({
            where: {
                parentId: currentFolder.id,
                deletedAt: null,
            },
            orderBy: [{ type: 'desc' }, { name: 'asc' }],
        });

        for (const child of children) {
            const childName = sanitizeZipSegment(getDisplayFileName(child));
            const childPath = `${folderPath}${childName}`;

            if (child.type === 'FOLDER') {
                await collectEntries(child, childPath);
                continue;
            }

            const objectId = child.objectId || child.id;
            totalFiles += 1;
            totalBytes += BigInt(child.size ?? 0);

            entries.push({
                path: ensureUniqueZipPath(childPath, usedPaths),
                modifiedAt: child.updatedAt,
                stream: () => s3Service.stream(objectId),
            });
        }
    };

    await collectEntries(folder, rootName);

    return {
        entries,
        fileName: `${rootName}.zip`,
        totalFiles,
        totalBytes: totalBytes.toString(),
    };
}

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

        await ActivityLogService.log({
            userId,
            entityType: 'file',
            entityId: f.id,
            action: 'create',
            description: `Created folder ${f.name}`,
            affectedEntityIds: f.parentId ? [f.parentId] : [],
        });

        return f;
    },

    uploadFile: async (request: FileUploadRequest, objectId: string, userId: string) => {
        const file = await prismaClient.file.create({
            data: {
                ...request,
                id: objectId,
                type: 'FILE',
                createdBy: userId,
                objectId,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'file',
            entityId: file.id,
            action: 'create',
            description: `Uploaded file ${file.name}`,
            affectedEntityIds: file.parentId ? [file.parentId] : [],
        });
    },

    getFileContent: async (id: string): Promise<FileContent> => {
        const file = await prismaClient.file.findUnique({
            where: { id },
        });

        if (!file || file.type !== 'FILE') throw new NotFoundError('No file found with id: ' + id);

        checkDeletedAt(file);

        const objectId = file.objectId || file.id;
        const content = await s3Service.read(objectId);

        return {
            file,
            fileName: getDisplayFileName(file),
            mimeType: file.mimeType || 'application/octet-stream',
            content,
        };
    },

    createFolderExportJob: async (
        folderId: string,
        userId: string
    ): Promise<FolderExportJobResponse> => {
        const folder = await prismaClient.file.findUnique({
            where: { id: folderId },
        });

        if (!folder || folder.type !== 'FOLDER')
            throw new NotFoundError('No folder found with id: ' + folderId);

        checkDeletedAt(folder);

        const plan = await buildFolderExportPlan(folder);
        const jobId = ulid();
        const job = await prismaClient.fileExportJob.create({
            data: {
                id: jobId,
                folderId,
                fileName: plan.fileName,
                totalFiles: plan.totalFiles,
                totalBytes: plan.totalBytes,
                createdBy: userId,
                expiresAt: new Date(Date.now() + EXPORT_EXPIRES_IN_SECONDS * 1000),
            },
        });

        void FileService.processFolderExportJob(job.id).catch((error: unknown) => {
            console.error('Folder export job failed', error);
        });

        return serializeExportJob(job);
    },

    getFolderExportJob: async (id: string, userId: string): Promise<FolderExportJobResponse> => {
        const job = await prismaClient.fileExportJob.findFirst({
            where: { id, createdBy: userId },
        });

        if (!job) throw new NotFoundError('No export job found with id: ' + id);

        if (job.status === 'COMPLETED' && job.expiresAt <= new Date()) {
            const expired = await prismaClient.fileExportJob.update({
                where: { id: job.id },
                data: { status: 'EXPIRED' },
            });

            return serializeExportJob(expired);
        }

        return serializeExportJob(job);
    },

    processFolderExportJob: async (id: string): Promise<void> => {
        const job = await prismaClient.fileExportJob.findUnique({
            where: { id },
        });

        if (!job || job.status !== 'PENDING') return;

        const objectId = `${EXPORT_OBJECT_PREFIX}/${job.id}/${job.fileName}`;
        const folder = await prismaClient.file.findUnique({
            where: { id: job.folderId },
        });

        if (!folder || folder.type !== 'FOLDER') {
            await prismaClient.fileExportJob.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    error: 'Folder no longer exists.',
                    completedAt: new Date(),
                },
            });
            return;
        }

        const writer = s3Service.createWriter(objectId, 'application/zip');
        let processedFiles = 0;
        let processedBytes = 0n;
        let lastProgressUpdate = 0;

        const updateProgress = async (force = false): Promise<void> => {
            const now = Date.now();
            if (!force && now - lastProgressUpdate < 1000) return;

            lastProgressUpdate = now;
            await prismaClient.fileExportJob.update({
                where: { id: job.id },
                data: {
                    processedFiles,
                    processedBytes: processedBytes.toString(),
                },
            });
        };

        try {
            await prismaClient.fileExportJob.update({
                where: { id: job.id },
                data: {
                    status: 'PROCESSING',
                    startedAt: new Date(),
                    objectId,
                    error: null,
                },
            });

            const plan = await buildFolderExportPlan(folder);

            await prismaClient.fileExportJob.update({
                where: { id: job.id },
                data: {
                    fileName: plan.fileName,
                    totalFiles: plan.totalFiles,
                    totalBytes: plan.totalBytes,
                },
            });

            await writeZipArchiveToSink(plan.entries, writer, async ({ bytes }) => {
                processedFiles += 1;
                processedBytes += BigInt(bytes);
                await updateProgress();
            });

            await writer.end();
            await updateProgress(true);

            await prismaClient.fileExportJob.update({
                where: { id: job.id },
                data: {
                    status: 'COMPLETED',
                    objectId,
                    processedFiles: plan.totalFiles,
                    processedBytes: plan.totalBytes,
                    completedAt: new Date(),
                    expiresAt: new Date(Date.now() + EXPORT_EXPIRES_IN_SECONDS * 1000),
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Folder export failed.';

            try {
                await writer.end(error instanceof Error ? error : new Error(message));
            } catch {
                // Upload abort errors are secondary to the export failure we persist below.
            }

            try {
                await s3Service.delete(objectId);
            } catch {
                // The object may not exist if upload failed before multipart completion.
            }

            await prismaClient.fileExportJob.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    error: message,
                    completedAt: new Date(),
                    processedFiles,
                    processedBytes: processedBytes.toString(),
                },
            });
        }
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
                | 'PRIME_CONTRACT'
                | 'SCHEDULE';
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
            { name: 'schedule', displayName: 'Schedule', protectedFolderType: 'SCHEDULE' },
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

    getGcFolderId: async (gcId: string, tx?: TransactionClient): Promise<string> => {
        const prisma = tx || prismaClient;
        const gcRootFolder = await FileService.getRootFolder('gc', tx);

        const gcFolder = await prisma.file.findFirst({
            where: {
                name: gcId,
                parentId: gcRootFolder.id,
            },
            select: { id: true },
        });

        if (!gcFolder) throw new NotFoundError(`Folder not found for GC: ${gcId}`);

        return gcFolder.id;
    },

    getVendorFolderId: async (vendorId: string, tx?: TransactionClient): Promise<string> => {
        const prisma = tx || prismaClient;
        const vendorRootFolder = await FileService.getRootFolder('vendor', tx);

        const vendorFolder = await prisma.file.findFirst({
            where: {
                name: vendorId,
                parentId: vendorRootFolder.id,
            },
            select: { id: true },
        });

        if (!vendorFolder) throw new NotFoundError(`Folder not found for vendor: ${vendorId}`);

        return vendorFolder.id;
    },

    getEmployeeFolderId: async (employeeId: string, tx?: TransactionClient): Promise<string> => {
        const prisma = tx || prismaClient;
        const employeesRootFolder = await FileService.getRootFolder('employees', tx);

        const employeeFolder = await prisma.file.findFirst({
            where: {
                name: employeeId,
                parentId: employeesRootFolder.id,
            },
            select: { id: true },
        });

        if (!employeeFolder)
            throw new NotFoundError(`Folder not found for employee: ${employeeId}`);

        return employeeFolder.id;
    },

    updateFolderDisplayName: async (
        folderId: string,
        displayName: string,
        tx?: TransactionClient
    ): Promise<void> => {
        const prisma = tx || prismaClient;

        await prisma.file.update({
            where: { id: folderId },
            data: { displayName },
        });
    },

    moveFileToFolder: async (
        fileId: string,
        folderId: string,
        tx?: TransactionClient
    ): Promise<void> => {
        const prisma = tx || prismaClient;

        await prisma.file.update({
            where: { id: fileId },
            data: { parentId: folderId },
        });
    },

    getProjectSubFolderId: async (
        projectId: string,
        type:
            | 'INVOICE'
            | 'RFQ'
            | 'PURCHASE_ORDER'
            | 'PURCHASE_ORDER_CO'
            | 'PRIME_CO'
            | 'PRIME_CONTRACT'
            | 'SCHEDULE',
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
            include: { createdByUser: true },
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
            include: { createdByUser: true },
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
            include: {
                createdByUser: true,
                children: {
                    where: { deletedAt: null },
                    include: { createdByUser: true },
                },
            },
        });

        checkDeletedAt(folder);

        if (!folder || folder.type !== 'FOLDER')
            throw new NotFoundError('No folder found with id: ' + id);

        return folder;
    },

    rename: async (request: FileFolderRenameRequest, userId: string): Promise<File> => {
        const file = await prismaClient.file.findUnique({
            where: { id: request.id },
        });

        if (!file) throw new NotFoundError('No file or folder found with id: ' + request.id);

        checkDeletedAt(file);

        if (!file.isDeletable)
            throw new BadRequestError(
                'Cannot rename this file / folder because it is protected or non-deletable.'
            );

        const updated = await prismaClient.file.update({
            where: { id: request.id },
            data: {
                name: request.name,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'file',
            entityId: updated.id,
            action: 'update',
            description: `Renamed ${file.name} to ${updated.name}`,
        });

        return updated;
    },

    deleteFolder: async (id: string, userId: string): Promise<void> => {
        const folder = await prismaClient.file.findUnique({
            where: { id },
            include: { children: { where: { deletedAt: null } } },
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

        await ActivityLogService.log({
            userId,
            entityType: 'file',
            entityId: id,
            action: 'delete',
            description: `Deleted folder ${folder.name}`,
            affectedEntityIds: folder.parentId ? [folder.parentId] : [],
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
                include: { createdByUser: true },
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

        await ActivityLogService.log({
            userId,
            entityType: 'file',
            entityId: id,
            action: 'delete',
            description: `Deleted file ${file.name}`,
            affectedEntityIds: file.parentId ? [file.parentId] : [],
        });
    },
};
