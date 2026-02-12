export const costCodesKeys = {
  all: ['cost-codes'] as const,
  list: () => [...costCodesKeys.all, 'list'] as const,
  detail: (id: string) => [...costCodesKeys.all, id] as const,
};
