export const costCodesKeys = {
  all: ['cost-codes'] as const,
  list: () => [...costCodesKeys.all, 'list'] as const,
  stats: () => [...costCodesKeys.all, 'stats'] as const,
  detail: (id: string) => [...costCodesKeys.all, id] as const,
};
