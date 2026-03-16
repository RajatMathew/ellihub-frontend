import { z } from 'zod';

export const pcoAttachmentSchema = z
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

export type PCOAttachment = z.infer<typeof pcoAttachmentSchema>;
