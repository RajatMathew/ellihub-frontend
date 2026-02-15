import z from 'zod';

export const FolderCreateSchema = z.object({
    name: z.string().min(1),
    parentId: z.ulid(),
});

export type FolderCreateRequest = z.infer<typeof FolderCreateSchema>;

export const FileUploadSchema = z.object({
    name: z.string().min(1),
    parentId: z.ulid(),
    mimeType: z.string().optional(),
});

export type FileUploadRequest = z.infer<typeof FileUploadSchema>;
