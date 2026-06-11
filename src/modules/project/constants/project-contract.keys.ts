export const projectContractKeys = {
  all: ['project-contracts'] as const,
  detail: (projectId: string) => [...projectContractKeys.all, projectId] as const,
};
