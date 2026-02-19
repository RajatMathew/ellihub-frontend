import z from 'zod';

export const FolderCreateSchema = z.object({
    name: z.string().min(1),
    parentId: z.ulid(),
});

export type FolderCreateRequest = z.infer<typeof FolderCreateSchema>;

export const FolderRenameSchema = z.object({
    id: z.ulid(),
    name: z.string().min(1),
});

export type FolderRenameRequest = z.infer<typeof FolderRenameSchema>;

export const FileUploadSchema = z.object({
    name: z.string().min(1),
    parentId: z.ulid(),
    mimeType: z.string().optional(),
    size: z.number(),
});

export type FileUploadRequest = z.infer<typeof FileUploadSchema>;
