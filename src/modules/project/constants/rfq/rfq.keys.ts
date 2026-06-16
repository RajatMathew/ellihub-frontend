export const rfqKeys = {
  all: ['rfqs'] as const,
  list: (projectId: string) => [...rfqKeys.all, 'list', projectId] as const,
  stats: (projectId: string) => [...rfqKeys.all, 'stats', projectId] as const,
  detail: (id: string) => [...rfqKeys.all, 'detail', id] as const,
  statuses: () => [...rfqKeys.all, 'statuses'] as const,
};
