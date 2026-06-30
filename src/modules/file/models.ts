import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const FolderCreateSchema = z.object({
    name: z.string().min(1),
    parentId: nanoIdSchema,
});

export type FolderCreateRequest = z.infer<typeof FolderCreateSchema>;

export const ProjectEntityFolderSchema = z.object({
    entityType: z.enum(['RFQ', 'PURCHASE_ORDER', 'SUB_CHANGE_ORDER', 'INVOICE']),
    entityId: nanoIdSchema,
});

export type ProjectEntityFolderRequest = z.infer<typeof ProjectEntityFolderSchema> & {
    projectId: string;
};

export const FileFolderRenameSchema = z.object({
    id: nanoIdSchema,
    name: z.string().min(1),
});

export type FileFolderRenameRequest = z.infer<typeof FileFolderRenameSchema>;

export const FileUploadSchema = z.object({
    name: z.string().trim().min(1).max(180),
    displayName: z.string().trim().min(1).max(180).optional(),
    parentId: nanoIdSchema.optional(),
    mimeType: z.string().optional(),
    size: z.number().int().positive(),
});

export type FileUploadRequest = z.infer<typeof FileUploadSchema>;
export const ChunkedFileUploadSchema = FileUploadSchema.extend({
    fileName: z.string().trim().min(1).max(180),
});

export type ChunkedFileUploadRequest = z.infer<typeof ChunkedFileUploadSchema>;

export const ChunkedFileUploadCompleteSchema = ChunkedFileUploadSchema.extend({
    totalChunks: z.number().int().positive(),
});

export type ChunkedFileUploadCompleteRequest = z.infer<typeof ChunkedFileUploadCompleteSchema>;
