export const vendorsKeys = {
  all: ['vendors'] as const,
  list: () => [...vendorsKeys.all, 'list'] as const,
  detail: (id: string) => [...vendorsKeys.all, id] as const,
};
