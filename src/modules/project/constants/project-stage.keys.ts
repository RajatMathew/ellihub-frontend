export const projectStageKeys = {
  all: ['project-stages'] as const,
  list: () => [...projectStageKeys.all, 'list'] as const,
};
