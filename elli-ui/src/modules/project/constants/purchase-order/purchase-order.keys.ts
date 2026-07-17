export const poKeys = {
  all: ['purchase-orders'] as const,
  list: () => [...poKeys.all, 'list'] as const,
  stats: (projectId: string) => [...poKeys.all, 'stats', projectId] as const,
  nextNumber: () => [...poKeys.all, 'next-number'] as const,
  numberAvailability: (poNumberSuffix: string, excludeId?: string) =>
    [...poKeys.all, 'number-availability', poNumberSuffix, excludeId ?? null] as const,
  detail: (id: string) => [...poKeys.all, id] as const,
  pdfDefaultTerms: () => [...poKeys.all, 'pdf-default-terms'] as const,
  pdfTermsOptions: () => [...poKeys.all, 'pdf-terms-options'] as const,
  summary: (projectId: string) => [...poKeys.all, 'summary', projectId] as const,
};
