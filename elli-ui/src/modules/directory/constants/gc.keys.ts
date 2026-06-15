export const gcKeys = {
  all: ['general-contractors'] as const,
  list: () => [...gcKeys.all, 'list'] as const,
  detail: (id: string) => [...gcKeys.all, id] as const,
  stats: () => [...gcKeys.all, 'stats'] as const,
  types: () => [...gcKeys.all, 'types'] as const,
};
