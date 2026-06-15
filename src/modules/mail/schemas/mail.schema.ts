import { z } from 'zod';

import { generatePdfTermsInputSchema } from '@/modules/pdf/schemas';

export const mailSignatureSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email(),
});

export type MailSignature = z.infer<typeof mailSignatureSchema>;

export const mailAttachmentPreviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentType: z.string(),
  source: z.string().optional(),
});

export type MailAttachmentPreview = z.infer<typeof mailAttachmentPreviewSchema>;

export const mailRecipientOptionSchema = z.object({
  id: z.string(),
  type: z.enum(['vendor', 'contact']),
  label: z.string(),
  email: z.string().email(),
  isPrimary: z.boolean().optional(),
});

export type MailRecipientOption = z.infer<typeof mailRecipientOptionSchema>;

export const mailRecipientGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  entityType: z.literal('vendor'),
  entityId: z.string(),
  quoteId: z.string().optional(),
  missingEntityEmail: z.boolean().optional(),
  options: z.array(mailRecipientOptionSchema).default([]),
});

export type MailRecipientGroup = z.infer<typeof mailRecipientGroupSchema>;

const featureMailDraftBaseSchema = z.object({
  from: z.string().email(),
  to: z.array(z.string().email()).default([]),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).default([]),
  subject: z.string().min(1),
  body: z.string().min(1),
  signature: mailSignatureSchema,
  attachmentIds: z.array(z.string()).default([]),
  saveToSentItems: z.boolean().default(true),
});

export const featureMailDraftPayloadSchema = featureMailDraftBaseSchema.extend({
  to: z.array(z.string().email()).min(1),
});

export type FeatureMailDraftPayload = z.infer<typeof featureMailDraftPayloadSchema>;

export const featureMailDraftSchema = featureMailDraftBaseSchema.extend({
  senderOptions: z.array(z.string().email()).default([]),
  html: z.string(),
  attachments: z.array(mailAttachmentPreviewSchema).default([]),
  recipientGroups: z.array(mailRecipientGroupSchema).optional().default([]),
  signatureAssets: z
    .array(
      z.object({
        fileName: z.string(),
        contentType: z.string(),
        contentId: z.string(),
      })
    )
    .default([]),
});

export type FeatureMailDraft = z.infer<typeof featureMailDraftSchema>;

export const featureMailKeySchema = z.enum([
  'rfq.vendorRequest',
  'rfq.vendorRequestAll',
  'purchaseOrder.vendorIssue',
  'subChangeOrder.vendorApproval',
]);

export type FeatureMailKey = z.infer<typeof featureMailKeySchema>;

export const featureMailTargetSchema = z.object({
  feature: featureMailKeySchema,
  entityId: z.string().min(1),
});

export type FeatureMailTarget = z.infer<typeof featureMailTargetSchema>;

export const featureMailActionSchema = featureMailTargetSchema.extend({
  draft: featureMailDraftPayloadSchema,
  pdfOptions: generatePdfTermsInputSchema.optional(),
});

export type FeatureMailAction = z.infer<typeof featureMailActionSchema>;
