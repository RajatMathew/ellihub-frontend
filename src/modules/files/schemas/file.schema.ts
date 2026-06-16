import { z } from 'zod';

import { MAX_UPLOAD_BYTES } from '@/modules/files/lib/file-upload-policy';

// --- Enums ---

export const fileTypeSchema = z.enum(['FILE', 'FOLDER']);
export type FileType = z.infer<typeof fileTypeSchema>;

export const fileBreadcrumbSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const fileExportStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'EXPIRED',
]);

// --- Main model ---

export const fileSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    objectId: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    parentId: z.string().nullable().optional(),
    type: fileTypeSchema,
    isDeletable: z.boolean(),
    private: z.boolean(),
    primeContract: z
      .object({
        id: z.string(),
        isPinned: z.boolean(),
        isPrimary: z.boolean(),
      })
      .nullable()
      .optional(),
    createdBy: z.string().nullable().optional(),
    createdByUser: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().nullable().optional(),
        image: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    deletedBy: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    breadcrumbs: z.array(fileBreadcrumbSchema).optional(),
  })
  .passthrough();

export type FileItem = z.infer<typeof fileSchema>;

// --- Folder detail (includes children array) ---

export const folderDetailSchema = fileSchema.extend({
  children: z.array(fileSchema),
});

export type FolderDetail = z.infer<typeof folderDetailSchema>;

export const filePaginationSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  totalItems: z.number(),
  itemsPerPage: z.number(),
});

export const fileSearchResponseSchema = z.object({
  data: z.array(fileSchema),
  pagination: filePaginationSchema,
});

export type FileSearchResponse = z.infer<typeof fileSearchResponseSchema>;

// --- Folder export jobs ---

export const fileExportJobSchema = z
  .object({
    id: z.string(),
    folderId: z.string(),
    status: fileExportStatusSchema,
    fileName: z.string(),
    totalFiles: z.coerce.number(),
    processedFiles: z.coerce.number(),
    totalBytes: z.string(),
    processedBytes: z.string(),
    error: z.string().nullable().optional(),
    downloadUrl: z.string().nullable().optional(),
    expiresAt: z.string(),
    startedAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type FileExportJob = z.infer<typeof fileExportJobSchema>;

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
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type FileUploadInput = z.infer<typeof fileUploadInputSchema>;

export const fileFolderRenameInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
});

export type FileFolderRenameInput = z.infer<typeof fileFolderRenameInputSchema>;
