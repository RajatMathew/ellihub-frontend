export const scoAttachmentKeys = {
  all: ['sco-attachments'] as const,
  list: (scoId: string) => [...scoAttachmentKeys.all, scoId] as const,
};
