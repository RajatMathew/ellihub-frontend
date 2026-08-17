import { z } from 'zod';

// --- Enums ---

export const fileTypeSchema = z.enum(['FILE', 'FOLDER']);
export type FileType = z.infer<typeof fileTypeSchema>;

export const fileBreadcrumbSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const fileActionCapabilitiesSchema = z.object({
  read: z.boolean(),
  download: z.boolean(),
  export: z.boolean(),
  upload: z.boolean(),
  createFolder: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

export type FileActionCapabilities = z.infer<typeof fileActionCapabilitiesSchema>;

export const fileExportStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
]);

/**
 * A record that references this file — an RFQ attachment, a vendor document, a
 * pinned prime contract. A file with any link whose owner is still live cannot
 * be deleted from Files.
 */
export const fileLinkSchema = z.object({
  linkKey: z.string(),
  linkLabel: z.string(),
  ownerId: z.string(),
  ownerLabel: z.string(),
  ownerDeleted: z.boolean(),
});

export type FileLink = z.infer<typeof fileLinkSchema>;

/**
 * What happened to the entity link when this file was created. Uploading into
 * an entity's folder attaches the file to that entity, so the upload response
 * says which record picked it up — `none` for an ordinary folder.
 */
export const fileAutoLinkSchema = z.object({
  status: z.enum(['none', 'linked', 'already-linked']),
  linkKey: z.string().optional(),
  ownerId: z.string().optional(),
  ownerLabel: z.string().optional(),
});

export type FileAutoLink = z.infer<typeof fileAutoLinkSchema>;

// --- Main model ---

export const fileSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    objectId: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    capabilities: fileActionCapabilitiesSchema.optional(),
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
    links: z.array(fileLinkSchema).optional(),
    // Separate from isDeletable: a referenced file cannot be deleted, but can
    // still be renamed, since entities link to it by id rather than by name.
    isLinked: z.boolean().optional(),
    // Only present on create responses (upload, import, copy).
    autoLink: fileAutoLinkSchema.optional(),
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
    folder: z
      .object({
        id: z.string(),
        name: z.string(),
        displayName: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    expiresAt: z.string(),
    startedAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    cancelledAt: z.string().nullable().optional(),
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
  size: z.number().int().positive(),
});

export type FileUploadInput = z.infer<typeof fileUploadInputSchema>;

export const fileFolderRenameInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
});

export type FileFolderRenameInput = z.infer<typeof fileFolderRenameInputSchema>;

/**
 * Server-side import of a third-party URL. The browser cannot fetch an
 * arbitrary vendor host (CORS), so the API downloads it and applies the same
 * extension/MIME allowlist the client enforces for direct uploads.
 */
export const fileImportUrlInputSchema = z.object({
  url: z.string().url('Enter a valid URL'),
  parentId: z.string(),
  name: z.string().min(1).optional(),
  mimeType: z.string().optional(),
});

export type FileImportUrlInput = z.infer<typeof fileImportUrlInputSchema>;

/** Server-side copy/move of a file that already lives in Files. */
export const fileTransferInputSchema = z.object({
  id: z.string(),
  parentId: z.string(),
  name: z.string().min(1).optional(),
});

export type FileTransferInput = z.infer<typeof fileTransferInputSchema>;
