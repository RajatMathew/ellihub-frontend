export const departmentsKeys = {
  all: ['departments'] as const,
  list: () => [...departmentsKeys.all, 'list'] as const,
  detail: (id: string) => [...departmentsKeys.all, id] as const,
};
