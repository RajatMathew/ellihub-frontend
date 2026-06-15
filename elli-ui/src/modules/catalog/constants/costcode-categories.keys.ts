export const costCodeCategoriesKeys = {
  all: ['cost-code-categories'] as const,
  list: () => [...costCodeCategoriesKeys.all, 'list'] as const,
  detail: (id: string) => [...costCodeCategoriesKeys.all, id] as const,
};
