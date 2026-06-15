import { z } from 'zod';

export const contractAttachmentFileSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    type: z.enum(['FILE', 'FOLDER']).optional(),
    deletedAt: z.string().nullable().optional(),
  })
  .passthrough();

export const contractAttachmentSchema = z
  .object({
    id: z.string(),
    projectId: z.string().optional(),
    fileId: z.string().nullable().optional(),
    isPrimary: z.boolean().optional().default(false),
    isPinned: z.boolean().optional().default(true),
    uploadedAt: z.string().nullable().optional(),
    file: contractAttachmentFileSchema.nullable().optional(),
    documentId: z.string().nullable().optional(),
    document: contractAttachmentFileSchema.nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export type ContractAttachment = z.infer<typeof contractAttachmentSchema>;

export const addContractAttachmentInputSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
});

export type AddContractAttachmentInput = z.infer<typeof addContractAttachmentInputSchema>;
