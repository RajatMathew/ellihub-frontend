export const projectScheduleKeys = {
  all: ['project-schedules'] as const,
  list: (projectId: string) => [...projectScheduleKeys.all, projectId] as const,
};
