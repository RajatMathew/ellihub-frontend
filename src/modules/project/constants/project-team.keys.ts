export const projectTeamKeys = {
  all: ['project-teams'] as const,
  detail: (projectId: string) => [...projectTeamKeys.all, projectId] as const,
};
