export const scoKeys = {
  all: ['scos'] as const,
  list: () => [...scoKeys.all, 'list'] as const,
  stats: (projectId: string) => [...scoKeys.all, 'stats', projectId] as const,
  detail: (id: string) => [...scoKeys.all, id] as const,
  byPurchaseOrder: (poId: string) => [...scoKeys.all, 'by-po', poId] as const,
  summary: (projectId: string) => [...scoKeys.all, 'summary', projectId] as const,
  changeTypes: () => [...scoKeys.all, 'change-types'] as const,
};
