export const lookupKeys = {
  all: ['lookups'] as const,
  lists: () => [...lookupKeys.all, 'list'] as const,
  list: (type?: string) => (type ? [...lookupKeys.lists(), type] : lookupKeys.lists()),
  detail: (id: string) => [...lookupKeys.all, id] as const,
};
