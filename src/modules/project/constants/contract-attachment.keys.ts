export const contractAttachmentKeys = {
  all: ['contract-attachments'] as const,
  list: (projectId: string) => [...contractAttachmentKeys.all, projectId] as const,
  candidates: (projectId: string) =>
    [...contractAttachmentKeys.all, projectId, 'candidates'] as const,
};
