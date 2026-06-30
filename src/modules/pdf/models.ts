import z from 'zod';

import { PDF_NOTICE_SECTIONS } from './notice-service';
import { PDF_TERMS_SECTIONS } from './terms-service';

export const PdfTermsSectionSchema = z.enum(PDF_TERMS_SECTIONS);
export const PdfNoticeSectionSchema = z.enum(PDF_NOTICE_SECTIONS);

export const PdfTermsSettingsUpdateSchema = z.object({
    includeByDefault: z.boolean(),
});

export const PdfNoticeSettingsUpdateSchema = z.object({
    includeByDefault: z.boolean(),
});

export type PdfTermsSettingsUpdateRequest = z.infer<typeof PdfTermsSettingsUpdateSchema>;
export type PdfNoticeSettingsUpdateRequest = z.infer<typeof PdfNoticeSettingsUpdateSchema>;
