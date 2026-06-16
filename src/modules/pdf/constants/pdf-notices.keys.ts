import type { PdfNoticeSection } from '@/modules/pdf/schemas';

export const pdfNoticeKeys = {
  all: ['pdf-notices'] as const,
  config: (section: PdfNoticeSection) => [...pdfNoticeKeys.all, 'config', section] as const,
};
