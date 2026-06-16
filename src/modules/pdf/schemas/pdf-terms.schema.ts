import { z } from 'zod';

export const pdfTermsSectionSchema = z.enum(['global', 'rfq', 'purchaseOrder', 'subChangeOrder']);
export type PdfTermsSection = z.infer<typeof pdfTermsSectionSchema>;
export const pdfNoticeSectionSchema = pdfTermsSectionSchema;
export type PdfNoticeSection = z.infer<typeof pdfNoticeSectionSchema>;

export const pdfTermsOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: pdfTermsSectionSchema,
  sectionLabel: z.string(),
  html: z.string(),
  isDefault: z.boolean(),
  isSectionDefault: z.boolean(),
});

export const pdfTermsConfigSchema = z.object({
  section: pdfTermsSectionSchema,
  sectionLabel: z.string(),
  includeByDefault: z.boolean(),
  options: z.array(pdfTermsOptionSchema),
  defaultOptionId: z.string().nullable(),
});

export const pdfNoticeOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: pdfNoticeSectionSchema,
  sectionLabel: z.string(),
  title: z.string(),
  html: z.string(),
  isDefault: z.boolean(),
  isSectionDefault: z.boolean(),
});

export const pdfNoticeConfigSchema = z.object({
  section: pdfNoticeSectionSchema,
  sectionLabel: z.string(),
  includeByDefault: z.boolean(),
  options: z.array(pdfNoticeOptionSchema),
  defaultOptionId: z.string().nullable(),
});

export const generatePdfTermsInputSchema = z.object({
  addTermsAndConditions: z.boolean().optional(),
  termsAndConditionsHtml: z.string().optional(),
  addWarningNotice: z.boolean().optional(),
  warningNoticeTitle: z.string().optional(),
  warningNoticeHtml: z.string().optional(),
});

export type PdfTermsOption = z.infer<typeof pdfTermsOptionSchema>;
export type PdfTermsConfig = z.infer<typeof pdfTermsConfigSchema>;
export type PdfNoticeOption = z.infer<typeof pdfNoticeOptionSchema>;
export type PdfNoticeConfig = z.infer<typeof pdfNoticeConfigSchema>;
export type GeneratePdfTermsInput = z.infer<typeof generatePdfTermsInputSchema>;
