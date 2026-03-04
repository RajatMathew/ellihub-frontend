export const pcoKeys = {
  all: ['pcos'] as const,
  list: (projectId: string) => [...pcoKeys.all, 'list', projectId] as const,
  pipeline: (projectId: string) => [...pcoKeys.all, 'pipeline', projectId] as const,
  detail: (id: string) => [...pcoKeys.all, 'detail', id] as const,
  statuses: () => [...pcoKeys.all, 'statuses'] as const,
  changeTypes: () => [...pcoKeys.all, 'changeTypes'] as const,
  financialImpact: (id: string) => [...pcoKeys.all, 'financialImpact', id] as const,
};
