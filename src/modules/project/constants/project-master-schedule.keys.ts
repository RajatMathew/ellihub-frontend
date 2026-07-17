export const projectMasterScheduleKeys = {
  all: ['project-master-schedule'] as const,
  detail: (projectId: string) => [...projectMasterScheduleKeys.all, projectId] as const,
};