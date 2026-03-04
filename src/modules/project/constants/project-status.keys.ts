export const projectStatusKeys = {
  all: ['project-statuses'] as const,
  list: () => [...projectStatusKeys.all, 'list'] as const,
};
