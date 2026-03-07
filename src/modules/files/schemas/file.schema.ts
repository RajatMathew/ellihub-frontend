import { z } from 'zod';

// --- Enums ---

export const fileTypeSchema = z.enum(['FILE', 'FOLDER']);
export type FileType = z.infer<typeof fileTypeSchema>;

// --- Main model ---

export const fileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    objectId: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    parentId: z.string().nullable().optional(),
    type: fileTypeSchema,
    isDeletable: z.boolean(),
    private: z.boolean(),
    createdBy: z.string(),
    deletedBy: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose();

export type FileItem = z.infer<typeof fileSchema>;

// --- Folder detail (includes children array) ---

export const folderDetailSchema = fileSchema.extend({
  children: z.array(fileSchema),
});

export type FolderDetail = z.infer<typeof folderDetailSchema>;

// --- Input schemas ---

export const folderCreateInputSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  parentId: z.string(),
});

export type FolderCreateInput = z.infer<typeof folderCreateInputSchema>;

export const fileUploadInputSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  parentId: z.string(),
  mimeType: z.string().optional(),
  size: z.number(),
});

export type FileUploadInput = z.infer<typeof fileUploadInputSchema>;

export const fileFolderRenameInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
});

export type FileFolderRenameInput = z.infer<typeof fileFolderRenameInputSchema>;
