import { z } from 'zod';

export const contractAttachmentSchema = z
  .object({
    id: z.string(),
    documentId: z.string().nullable().optional(),
    document: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .passthrough()
      .nullable()
      .optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export type ContractAttachment = z.infer<typeof contractAttachmentSchema>;

export const addContractAttachmentInputSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
});

export type AddContractAttachmentInput = z.infer<typeof addContractAttachmentInputSchema>;
