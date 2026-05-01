export const poKeys = {
  all: ['purchase-orders'] as const,
  list: () => [...poKeys.all, 'list'] as const,
  detail: (id: string) => [...poKeys.all, id] as const,
  summary: (projectId: string) => [...poKeys.all, 'summary', projectId] as const,
};
