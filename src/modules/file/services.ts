import { File, FileExportJob, type ProtectedFolderType } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma as prismaClient } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log/service';
import { UserService } from '@modules/user/services';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    FileFolderRenameRequest,
    FileUploadRequest,
    FolderCreateRequest,
    ProjectEntityFolderRequest,
} from './models';
import { storageService } from './storage';
import { writeZipArchiveToSink, ZipStreamEntry } from './zip';

type FileContent = {
    file: File;
    fileName: string;
    mimeType: string;
    content: Uint8Array;
};

type FileStreamContent = {
    file: File;
    fileName: string;
    mimeType: string;
    size: number | null;
    stream: ReadableStream<Uint8Array>;
};

type GeneratedFileSaveRequest<T> = {
    name: string;
    displayName?: string;
    parentId: string;
    mimeType: string;
    content: Uint8Array;
    afterCreate?: (file: File, tx: TransactionClient) => Promise<T>;
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

type FileBreadcrumb = {
    id: string;
    name: string;
};

type PrimeContractFileState = {
    id: string;
    fileId: string;
    isPrimary: boolean;
};

type FileWithPrimeContracts = File & {
    primeContracts?: PrimeContractFileState[];
};

type FilePrimeContractMetadata = {
    id: string;
    isPinned: boolean;
    isPrimary: boolean;
};

type FileSearchResult = File & {
    breadcrumbs?: FileBreadcrumb[];
    primeContract?: FilePrimeContractMetadata | null;
};
type FileWithPrimeContractMetadata = File & {
    primeContract?: FilePrimeContractMetadata | null;
};
type FileWithChildren = File & { children: FileWithPrimeContractMetadata[] };

type ProjectSubFolderType = Extract<
    ProtectedFolderType,
    | 'INVOICE'
    | 'RFQ'
    | 'PURCHASE_ORDER'
    | 'PURCHASE_ORDER_CO'
    | 'PRIME_CO'
    | 'SUB_CHANGE_ORDER'
    | 'PRIME_CONTRACT'
    | 'SCHEDULE'
>;

type ProjectEntityFolderConfig = {
    parentType: ProjectSubFolderType;
    displayName: string;
};

type ProjectSubFolderConfig = {
    name: string;
    displayName: string;
    protectedFolderType: ProjectSubFolderType;
};

type ProjectRootFolder = Pick<File, 'id' | 'createdBy'>;

const EXPORT_EXPIRES_IN_SECONDS = 24 * 60 * 60;
const EXPORT_OBJECT_PREFIX = 'exports';
const FILE_UNAVAILABLE_MESSAGE = 'This file no longer exists or has been deleted.';

const PROJECT_SUBFOLDERS: ProjectSubFolderConfig[] = [
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
        name: 'sub change order',
        displayName: 'Sub Change Order',
        protectedFolderType: 'SUB_CHANGE_ORDER',
    },
    {
        name: 'prime contract',
        displayName: 'Prime Contract',
        protectedFolderType: 'PRIME_CONTRACT',
    },
    { name: 'schedule', displayName: 'Schedule', protectedFolderType: 'SCHEDULE' },
];

const LEGACY_SCO_PARENT_TYPES: ProjectSubFolderType[] = ['PRIME_CO', 'PURCHASE_ORDER_CO'];

function getProjectSubFolderConfig(type: ProjectSubFolderType): ProjectSubFolderConfig {
    const config = PROJECT_SUBFOLDERS.find((subFolder) => subFolder.protectedFolderType === type);
    if (!config) throw new BadRequestError(`Unsupported project sub-folder type: ${type}`);

    return config;
}

function assertActiveFile(file: File | null): File {
    if (!file || file.type !== 'FILE' || file.deletedAt) {
        throw new NotFoundError(FILE_UNAVAILABLE_MESSAGE);
    }

    return file;
}

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
        ? await storageService.getDownloadLink(job.objectId!, EXPORT_EXPIRES_IN_SECONDS)
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
                stream: () => storageService.stream(objectId),
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

async function getDescendantFileIds(folderId: string): Promise<string[]> {
    const folder = await prismaClient.file.findUnique({
        where: { id: folderId },
        select: { id: true, type: true, deletedAt: true },
    });

    if (!folder || folder.type !== 'FOLDER') {
        throw new NotFoundError('No folder found with id: ' + folderId);
    }

    if (folder.deletedAt) {
        throw new NotFoundError('No folder found with id: ' + folderId);
    }

    const descendantIds: string[] = [];
    let nextParentIds = [folderId];

    while (nextParentIds.length > 0) {
        const children = await prismaClient.file.findMany({
            where: {
                parentId: { in: nextParentIds },
                deletedAt: null,
            },
            select: { id: true, type: true },
        });

        descendantIds.push(...children.map((child) => child.id));
        nextParentIds = children
            .filter((child) => child.type === 'FOLDER')
            .map((child) => child.id);
    }

    return descendantIds;
}

function isPrimeContractFolder(file: Pick<File, 'protectedFolderType'> | null | undefined) {
    return file?.protectedFolderType === 'PRIME_CONTRACT';
}

function withPrimeContractMetadata<T extends FileWithPrimeContracts>(
    file: T
): Omit<T, 'primeContracts'> & { primeContract: FilePrimeContractMetadata | null } {
    const { primeContracts, ...rest } = file;
    const primeContract = primeContracts?.[0] ?? null;

    return {
        ...rest,
        primeContract: primeContract
            ? {
                  id: primeContract.id,
                  isPinned: true,
                  isPrimary: primeContract.isPrimary,
              }
            : null,
    };
}

async function applyLatestChildUpdatedAt<T extends File>(children: T[]): Promise<T[]> {
    const folderIds = children.filter((child) => child.type === 'FOLDER').map((child) => child.id);

    if (folderIds.length === 0) return children;

    const latestChildrenByFolder = await prismaClient.file.groupBy({
        by: ['parentId'],
        where: {
            parentId: { in: folderIds },
            deletedAt: null,
        },
        _max: {
            updatedAt: true,
        },
    });

    const latestUpdatedAtByFolderId = new Map(
        latestChildrenByFolder
            .filter((entry) => entry.parentId && entry._max.updatedAt)
            .map((entry) => [entry.parentId!, entry._max.updatedAt!])
    );

    return children.map((child) => {
        const latestChildUpdatedAt = latestUpdatedAtByFolderId.get(child.id);

        if (!latestChildUpdatedAt || latestChildUpdatedAt <= child.updatedAt) return child;

        return {
            ...child,
            updatedAt: latestChildUpdatedAt,
        };
    });
}

async function assertUniqueSiblingName({
    name,
    parentId,
    excludeId,
    tx,
}: {
    name: string;
    parentId?: string | null;
    excludeId?: string;
    tx?: TransactionClient;
}): Promise<string> {
    const prisma = tx || prismaClient;
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestError('Name is required.');

    const existing = await prisma.file.findFirst({
        where: {
            parentId: parentId ?? null,
            deletedAt: null,
            name: { equals: normalizedName, mode: 'insensitive' },
            ...(excludeId && { id: { not: excludeId } }),
        },
        select: { id: true },
    });

    if (existing) {
        throw new ConflictError(`A file or folder named "${normalizedName}" already exists here.`);
    }

    return normalizedName;
}

async function getProjectRootFolder(
    projectId: string,
    tx?: TransactionClient
): Promise<ProjectRootFolder> {
    const prisma = tx || prismaClient;

    const projectFolder = await prisma.file.findFirst({
        where: {
            name: projectId,
            protectedFolderType: 'PROJECT_ROOT',
            deletedAt: null,
        },
        select: { id: true, createdBy: true },
    });

    if (!projectFolder)
        throw new NotFoundError(`Project folder not found for project: ${projectId}`);

    return projectFolder;
}

async function ensureProjectSubFolder(
    projectFolder: ProjectRootFolder,
    type: ProjectSubFolderType,
    tx?: TransactionClient
): Promise<string> {
    const prisma = tx || prismaClient;
    const config = getProjectSubFolderConfig(type);

    const existing = await prisma.file.findFirst({
        where: {
            parentId: projectFolder.id,
            protectedFolderType: type,
            deletedAt: null,
        },
        select: { id: true, name: true, displayName: true },
    });

    if (existing) {
        if (existing.name !== config.name || existing.displayName !== config.displayName) {
            await prisma.file.update({
                where: { id: existing.id },
                data: {
                    name: config.name,
                    displayName: config.displayName,
                    isDeletable: false,
                },
            });
        }

        return existing.id;
    }

    const folder = await prisma.file.create({
        data: {
            id: generateNanoId(),
            name: config.name,
            displayName: config.displayName,
            type: 'FOLDER',
            createdBy: projectFolder.createdBy,
            isDeletable: false,
            parentId: projectFolder.id,
            protectedFolderType: config.protectedFolderType,
        },
    });

    return folder.id;
}

async function getLegacyScoParentIds(
    projectRootFolderId: string,
    tx?: TransactionClient
): Promise<string[]> {
    const prisma = tx || prismaClient;

    const folders = await prisma.file.findMany({
        where: {
            parentId: projectRootFolderId,
            protectedFolderType: { in: LEGACY_SCO_PARENT_TYPES },
            deletedAt: null,
        },
        select: { id: true },
    });

    return folders.map((folder) => folder.id);
}

async function moveLegacyScoEntityFolders({
    projectId,
    projectRootFolderId,
    subChangeOrderFolderId,
    tx,
}: {
    projectId: string;
    projectRootFolderId: string;
    subChangeOrderFolderId: string;
    tx?: TransactionClient;
}): Promise<void> {
    const prisma = tx || prismaClient;
    const legacyParentIds = await getLegacyScoParentIds(projectRootFolderId, tx);
    if (legacyParentIds.length === 0) return;

    const scos = await prisma.subChangeOrder.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true },
    });
    const scoIds = scos.map((sco) => sco.id);
    if (scoIds.length === 0) return;

    const legacyFolders = await prisma.file.findMany({
        where: {
            parentId: { in: legacyParentIds },
            type: 'FOLDER',
            name: { in: scoIds },
            deletedAt: null,
        },
        select: { id: true, name: true },
    });

    for (const folder of legacyFolders) {
        const existingTarget = await prisma.file.findFirst({
            where: {
                parentId: subChangeOrderFolderId,
                name: folder.name,
                deletedAt: null,
                id: { not: folder.id },
            },
            select: { id: true },
        });

        if (existingTarget) continue;

        await prisma.file.update({
            where: { id: folder.id },
            data: { parentId: subChangeOrderFolderId },
        });
    }
}

async function moveFileToFolderIfNoNameConflict(
    file: Pick<File, 'id' | 'name'>,
    folderId: string,
    tx?: TransactionClient
): Promise<void> {
    const prisma = tx || prismaClient;

    const conflict = await prisma.file.findFirst({
        where: {
            parentId: folderId,
            name: { equals: file.name, mode: 'insensitive' },
            deletedAt: null,
            id: { not: file.id },
        },
        select: { id: true },
    });

    if (conflict) return;

    await prisma.file.update({
        where: { id: file.id },
        data: { parentId: folderId },
    });
}

async function moveLegacyScoAttachmentFilesForProject({
    projectId,
    projectFolder,
    subChangeOrderFolderId,
    tx,
}: {
    projectId: string;
    projectFolder: ProjectRootFolder;
    subChangeOrderFolderId: string;
    tx?: TransactionClient;
}): Promise<void> {
    const prisma = tx || prismaClient;
    const legacyParentIds = await getLegacyScoParentIds(projectFolder.id, tx);
    if (legacyParentIds.length === 0) return;

    const scos = await prisma.subChangeOrder.findMany({
        where: {
            projectId,
            deletedAt: null,
            attachments: {
                some: {
                    document: {
                        parentId: { in: legacyParentIds },
                        deletedAt: null,
                    },
                },
            },
        },
        select: {
            id: true,
            scoNumber: true,
            title: true,
            attachments: {
                where: {
                    document: {
                        parentId: { in: legacyParentIds },
                        deletedAt: null,
                    },
                },
                select: {
                    document: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
    });

    for (const sco of scos) {
        const displayName = sco.scoNumber || sco.title || sco.id;
        const existingFolder = await prisma.file.findFirst({
            where: {
                parentId: subChangeOrderFolderId,
                name: sco.id,
                deletedAt: null,
            },
            select: { id: true, type: true, displayName: true },
        });

        let entityFolderId: string | null = null;

        if (existingFolder?.type === 'FOLDER') {
            entityFolderId = existingFolder.id;

            if (existingFolder.displayName !== displayName) {
                await prisma.file.update({
                    where: { id: existingFolder.id },
                    data: { displayName },
                });
            }
        } else if (!existingFolder) {
            const folder = await prisma.file.create({
                data: {
                    id: generateNanoId(),
                    name: sco.id,
                    displayName,
                    type: 'FOLDER',
                    createdBy: projectFolder.createdBy,
                    isDeletable: false,
                    parentId: subChangeOrderFolderId,
                },
            });

            entityFolderId = folder.id;
        }

        if (!entityFolderId) continue;

        for (const attachment of sco.attachments) {
            await moveFileToFolderIfNoNameConflict(attachment.document, entityFolderId, tx);
        }
    }
}

async function ensureProjectStandardFolders(
    projectId: string,
    projectFolder: ProjectRootFolder,
    tx?: TransactionClient
): Promise<void> {
    let subChangeOrderFolderId: string | null = null;

    for (const subFolder of PROJECT_SUBFOLDERS) {
        const folderId = await ensureProjectSubFolder(
            projectFolder,
            subFolder.protectedFolderType,
            tx
        );

        if (subFolder.protectedFolderType === 'SUB_CHANGE_ORDER') {
            subChangeOrderFolderId = folderId;
        }
    }

    if (subChangeOrderFolderId) {
        await moveLegacyScoEntityFolders({
            projectId,
            projectRootFolderId: projectFolder.id,
            subChangeOrderFolderId,
            tx,
        });
        await moveLegacyScoAttachmentFilesForProject({
            projectId,
            projectFolder,
            subChangeOrderFolderId,
            tx,
        });
    }
}

async function moveLegacyScoAttachmentFiles({
    request,
    entityFolderId,
    tx,
}: {
    request: ProjectEntityFolderRequest;
    entityFolderId: string;
    tx?: TransactionClient;
}): Promise<void> {
    if (request.entityType !== 'SUB_CHANGE_ORDER') return;

    const prisma = tx || prismaClient;
    const projectFolder = await getProjectRootFolder(request.projectId, tx);
    const legacyParentIds = await getLegacyScoParentIds(projectFolder.id, tx);
    if (legacyParentIds.length === 0) return;

    const attachments = await prisma.sCOAttachment.findMany({
        where: {
            scoId: request.entityId,
            document: {
                parentId: { in: legacyParentIds },
                deletedAt: null,
            },
        },
        select: {
            document: {
                select: { id: true, name: true },
            },
        },
    });

    for (const attachment of attachments) {
        await moveFileToFolderIfNoNameConflict(attachment.document, entityFolderId, tx);
    }
}

async function resolveProjectEntityFolderConfig(
    request: ProjectEntityFolderRequest,
    tx?: TransactionClient
): Promise<ProjectEntityFolderConfig> {
    const prisma = tx || prismaClient;

    switch (request.entityType) {
        case 'RFQ': {
            const rfq = await prisma.rFQ.findUnique({
                where: { id: request.entityId },
                select: {
                    id: true,
                    projectId: true,
                    rfqNumber: true,
                    title: true,
                    deletedAt: true,
                },
            });
            if (!rfq) throw new NotFoundError('RFQ not found');
            checkDeletedAt(rfq);
            if (rfq.projectId !== request.projectId) {
                throw new BadRequestError('RFQ does not belong to this project');
            }
            return {
                parentType: 'RFQ',
                displayName: rfq.rfqNumber || rfq.title || rfq.id,
            };
        }
        case 'PURCHASE_ORDER': {
            const po = await prisma.purchaseOrder.findUnique({
                where: { id: request.entityId },
                select: {
                    id: true,
                    projectId: true,
                    poNumber: true,
                    description: true,
                    deletedAt: true,
                },
            });
            if (!po) throw new NotFoundError('Purchase order not found');
            checkDeletedAt(po);
            if (po.projectId !== request.projectId) {
                throw new BadRequestError('Purchase order does not belong to this project');
            }
            return {
                parentType: 'PURCHASE_ORDER',
                displayName: po.poNumber || po.description || po.id,
            };
        }
        case 'SUB_CHANGE_ORDER': {
            const sco = await prisma.subChangeOrder.findUnique({
                where: { id: request.entityId },
                select: {
                    id: true,
                    projectId: true,
                    scoNumber: true,
                    title: true,
                    deletedAt: true,
                },
            });
            if (!sco) throw new NotFoundError('Sub change order not found');
            checkDeletedAt(sco);
            if (sco.projectId !== request.projectId) {
                throw new BadRequestError('Sub change order does not belong to this project');
            }
            return {
                parentType: 'SUB_CHANGE_ORDER',
                displayName: sco.scoNumber || sco.title || sco.id,
            };
        }
        case 'INVOICE': {
            const invoice = await prisma.invoice.findUnique({
                where: { id: request.entityId },
                select: {
                    id: true,
                    projectId: true,
                    invoiceNumber: true,
                    deletedAt: true,
                },
            });
            if (!invoice) throw new NotFoundError('Invoice not found');
            checkDeletedAt(invoice);
            if (invoice.projectId !== request.projectId) {
                throw new BadRequestError('Invoice does not belong to this project');
            }
            return {
                parentType: 'INVOICE',
                displayName: invoice.invoiceNumber || invoice.id,
            };
        }
        default:
            throw new BadRequestError('Unsupported project entity folder type');
    }
}

export const FileService = {
    protectedFolderNames: [
        'root',
        'projects',
        'project',
        ...PROJECT_SUBFOLDERS.map((folder) => folder.name),
        'temp',
        'vendor',
        'employees',
        'gc',
    ],

    createFolder: async (request: FolderCreateRequest, userId: string): Promise<File> => {
        const name = await assertUniqueSiblingName({
            name: request.name,
            parentId: request.parentId,
        });

        if (FileService.protectedFolderNames.includes(name.toLowerCase()))
            throw new BadRequestError(`Cannot name folder '${name}'`);

        const f = await prismaClient.$transaction(async (tx) => {
            const file = await tx.file.create({
                data: {
                    id: generateNanoId(),
                    name,
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

    getOrCreateProjectEntityFolder: async (
        request: ProjectEntityFolderRequest,
        userId: string,
        tx?: TransactionClient
    ): Promise<string> => {
        const prisma = tx || prismaClient;
        const config = await resolveProjectEntityFolderConfig(request, tx);
        const parentId = await FileService.getProjectSubFolderId(
            request.projectId,
            config.parentType,
            tx
        );

        const existing = await prisma.file.findFirst({
            where: {
                parentId,
                name: request.entityId,
                deletedAt: null,
            },
            select: {
                id: true,
                type: true,
                displayName: true,
            },
        });

        if (existing) {
            if (existing.type !== 'FOLDER') {
                throw new ConflictError(
                    `A file named "${config.displayName}" already exists in this folder.`
                );
            }

            if (existing.displayName !== config.displayName) {
                await prisma.file.update({
                    where: { id: existing.id },
                    data: { displayName: config.displayName },
                });
            }

            await moveLegacyScoAttachmentFiles({
                request,
                entityFolderId: existing.id,
                tx,
            });

            return existing.id;
        }

        const folder = await prisma.file.create({
            data: {
                id: generateNanoId(),
                name: request.entityId,
                displayName: config.displayName,
                type: 'FOLDER',
                createdBy: userId,
                isDeletable: false,
                parentId,
            },
        });

        await moveLegacyScoAttachmentFiles({
            request,
            entityFolderId: folder.id,
            tx,
        });

        return folder.id;
    },

    uploadFile: async (request: FileUploadRequest, objectId: string, userId: string) => {
        const name = await assertUniqueSiblingName({
            name: request.name,
            parentId: request.parentId,
        });

        const file = await prismaClient.file.create({
            data: {
                ...request,
                id: objectId,
                name,
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

    saveGeneratedFile: async <T = undefined>(
        request: GeneratedFileSaveRequest<T>,
        userId: string
    ): Promise<{ file: File; result: T | undefined }> => {
        const objectId = generateNanoId();
        const writer = storageService.createWriter(objectId, request.mimeType);

        try {
            writer.write(request.content);
            await writer.end();
        } catch (error) {
            await Promise.resolve(writer.end(error instanceof Error ? error : undefined)).catch(
                () => undefined
            );

            throw error;
        }

        try {
            return await prismaClient.$transaction(async (tx) => {
                const name = await assertUniqueSiblingName({
                    name: request.name,
                    parentId: request.parentId,
                    tx,
                });

                const file = await tx.file.create({
                    data: {
                        id: objectId,
                        name,
                        displayName: request.displayName,
                        parentId: request.parentId,
                        mimeType: request.mimeType,
                        size: request.content.byteLength,
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
                    description: `Saved generated PDF ${file.name}`,
                    affectedEntityIds: [request.parentId],
                    tx,
                });

                const result = request.afterCreate
                    ? await request.afterCreate(file, tx)
                    : undefined;

                return { file, result };
            });
        } catch (error) {
            await storageService.delete(objectId).catch(() => undefined);
            throw error;
        }
    },

    ensureFileAvailable: async (id: string): Promise<void> => {
        const file = await prismaClient.file.findUnique({
            where: { id },
        });

        assertActiveFile(file);
    },

    getDownloadLink: async (id: string): Promise<string> => {
        const file = await prismaClient.file.findUnique({
            where: { id },
        });
        const activeFile = assertActiveFile(file);
        const objectId = activeFile.objectId || activeFile.id;

        try {
            return await storageService.getDownloadLink(objectId);
        } catch {
            throw new NotFoundError(FILE_UNAVAILABLE_MESSAGE);
        }
    },

    getFileContent: async (id: string): Promise<FileContent> => {
        const file = await prismaClient.file.findUnique({
            where: { id },
        });

        const activeFile = assertActiveFile(file);

        const objectId = activeFile.objectId || activeFile.id;
        let content: Uint8Array;

        try {
            content = await storageService.read(objectId);
        } catch {
            throw new NotFoundError(FILE_UNAVAILABLE_MESSAGE);
        }

        return {
            file: activeFile,
            fileName: getDisplayFileName(activeFile),
            mimeType: activeFile.mimeType || 'application/octet-stream',
            content,
        };
    },

    getFileStream: async (id: string): Promise<FileStreamContent> => {
        const file = await prismaClient.file.findUnique({
            where: { id },
        });

        const activeFile = assertActiveFile(file);
        const objectId = activeFile.objectId || activeFile.id;

        try {
            if (!(await storageService.exists(objectId))) {
                throw new NotFoundError(FILE_UNAVAILABLE_MESSAGE);
            }

            return {
                file: activeFile,
                fileName: getDisplayFileName(activeFile),
                mimeType: activeFile.mimeType || 'application/octet-stream',
                size: activeFile.size,
                stream: storageService.stream(objectId),
            };
        } catch {
            throw new NotFoundError(FILE_UNAVAILABLE_MESSAGE);
        }
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
        const jobId = generateNanoId();
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

        const writer = storageService.createWriter(objectId, 'application/zip');
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
                await storageService.delete(objectId);
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

        const projectFolder = await tx.file.create({
            data: {
                id: generateNanoId(),
                name: projectId,
                displayName,
                type: 'FOLDER',
                createdBy: userId,
                isDeletable: false,
                parentId: projectsRootFolder.id,
                protectedFolderType: 'PROJECT_ROOT',
            },
        });

        for (const sf of PROJECT_SUBFOLDERS) {
            await tx.file.create({
                data: {
                    id: generateNanoId(),
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
                id: generateNanoId(),
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
                id: generateNanoId(),
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
                id: generateNanoId(),
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
        const projectFolder = await getProjectRootFolder(projectId, tx);
        await ensureProjectStandardFolders(projectId, projectFolder, tx);

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
        const [file, targetFolder] = await Promise.all([
            prisma.file.findUnique({
                where: { id: fileId },
                select: { name: true, deletedAt: true },
            }),
            prisma.file.findUnique({
                where: { id: folderId },
                select: { type: true, deletedAt: true },
            }),
        ]);

        if (!file || file.deletedAt) throw new NotFoundError('File not found');
        if (!targetFolder || targetFolder.type !== 'FOLDER' || targetFolder.deletedAt) {
            throw new NotFoundError('Target folder not found');
        }

        const name = await assertUniqueSiblingName({
            name: file.name,
            parentId: folderId,
            excludeId: fileId,
            tx,
        });

        await prisma.file.update({
            where: { id: fileId },
            data: { parentId: folderId, name },
        });
    },

    getProjectSubFolderId: async (
        projectId: string,
        type: ProjectSubFolderType,
        tx?: TransactionClient
    ): Promise<string> => {
        const prisma = tx || prismaClient;

        const projectFolder = await getProjectRootFolder(projectId, tx);
        await ensureProjectStandardFolders(projectId, projectFolder, tx);

        const subFolder = await prisma.file.findFirst({
            where: {
                parentId: projectFolder.id,
                protectedFolderType: type,
                deletedAt: null,
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

    getFolderDetails: async (id: string): Promise<FileWithChildren> => {
        const folder = await prismaClient.file.findUnique({
            where: { id },
            include: {
                createdByUser: true,
                children: {
                    where: { deletedAt: null },
                    include: {
                        createdByUser: true,
                        primeContracts: {
                            select: { id: true, fileId: true, isPrimary: true },
                            take: 1,
                        },
                    },
                },
            },
        });

        checkDeletedAt(folder);

        if (!folder || folder.type !== 'FOLDER')
            throw new NotFoundError('No folder found with id: ' + id);

        const children = await applyLatestChildUpdatedAt(folder.children);

        if (isPrimeContractFolder(folder)) {
            return {
                ...folder,
                children: children.map((child) => ({
                    ...withPrimeContractMetadata(child),
                    isDeletable: false,
                })),
            };
        }

        return {
            ...folder,
            children: children.map((child) => withPrimeContractMetadata(child)),
        };
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

        const name = await assertUniqueSiblingName({
            name: request.name,
            parentId: file.parentId,
            excludeId: file.id,
        });

        const updated = await prismaClient.file.update({
            where: { id: request.id },
            data: {
                name,
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

    getBreadcrumbs: async (folderId: string): Promise<FileBreadcrumb[]> => {
        const breadcrumbs: { id: string; name: string }[] = [];
        let currentId: string | null = folderId;

        while (currentId) {
            const folder: {
                id: string;
                name: string;
                displayName: string | null;
                parentId: string | null;
            } | null = await prismaClient.file.findUnique({
                where: { id: currentId! },
                select: { id: true, name: true, displayName: true, parentId: true },
            });

            if (!folder) break;

            breadcrumbs.unshift({ id: folder.id, name: folder.displayName || folder.name });
            currentId = folder.parentId;
        }

        return breadcrumbs;
    },

    searchFiles: async (
        params: PaginationParams
    ): Promise<{ data: FileSearchResult[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const {
            search: filterSearch,
            type,
            mimeType,
            parentId,
            ancestorId,
            createdBy,
            createdFrom,
            createdTo,
            ...restFilter
        } = filter || {};
        const search = querySearch || filterSearch;
        const descendantIds =
            typeof ancestorId === 'string' && ancestorId
                ? await getDescendantFileIds(ancestorId)
                : undefined;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(type && { type }),
            ...(mimeType && { mimeType: { contains: mimeType, mode: 'insensitive' as const } }),
            ...(parentId && { parentId }),
            ...(descendantIds && { id: { in: descendantIds } }),
            ...(createdBy && { createdBy }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { displayName: { contains: search, mode: 'insensitive' as const } },
                ],
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
                include: {
                    createdByUser: true,
                    primeContracts: {
                        select: { id: true, fileId: true, isPrimary: true },
                        take: 1,
                    },
                },
            }),
        ]);
        const parentIds = Array.from(
            new Set(data.map((file) => file.parentId).filter((id): id is string => Boolean(id)))
        );
        const primeContractParentIds =
            parentIds.length > 0
                ? new Set(
                      (
                          await prismaClient.file.findMany({
                              where: {
                                  id: { in: parentIds },
                                  protectedFolderType: 'PRIME_CONTRACT',
                              },
                              select: { id: true },
                          })
                      ).map((folder) => folder.id)
                  )
                : new Set<string>();

        const dataWithBreadcrumbs = await Promise.all(
            data.map(async (file) => {
                const withMetadata = withPrimeContractMetadata(file);

                return {
                    ...withMetadata,
                    isDeletable:
                        file.parentId && primeContractParentIds.has(file.parentId)
                            ? false
                            : file.isDeletable,
                    breadcrumbs: await FileService.getBreadcrumbs(
                        file.type === 'FOLDER' ? file.id : file.parentId || file.id
                    ),
                };
            })
        );

        return { data: dataWithBreadcrumbs, count };
    },

    deleteFile: async (id: string, userId: string): Promise<void> => {
        const file = await prismaClient.file.findUnique({
            where: { id },
            include: {
                parent: { select: { protectedFolderType: true } },
                primeContracts: { select: { id: true }, take: 1 },
            },
        });

        if (!file) throw new NotFoundError('No file found with id: ' + id);

        checkDeletedAt(file);

        if (!file.isDeletable) throw new BadRequestError('Cannot delete this file.');

        if (isPrimeContractFolder(file.parent) || file.primeContracts.length > 0) {
            throw new BadRequestError('Prime contract files cannot be deleted from Files.');
        }

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
