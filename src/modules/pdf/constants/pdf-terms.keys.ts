import type { PdfTermsSection } from '@/modules/pdf/schemas';

export const pdfTermsKeys = {
  all: ['pdf-terms'] as const,
  config: (section: PdfTermsSection) => [...pdfTermsKeys.all, 'config', section] as const,
};
