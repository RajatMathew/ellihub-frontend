export const poKeys = {
  all: ['purchase-orders'] as const,
  list: () => [...poKeys.all, 'list'] as const,
  stats: (projectId: string) => [...poKeys.all, 'stats', projectId] as const,
  detail: (id: string) => [...poKeys.all, id] as const,
  pdfDefaultTerms: () => [...poKeys.all, 'pdf-default-terms'] as const,
  pdfTermsOptions: () => [...poKeys.all, 'pdf-terms-options'] as const,
  summary: (projectId: string) => [...poKeys.all, 'summary', projectId] as const,
};
