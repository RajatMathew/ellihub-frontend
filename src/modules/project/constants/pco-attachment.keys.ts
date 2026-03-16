export const pcoAttachmentKeys = {
  all: ['pco-attachments'] as const,
  list: (pcoId: string) => [...pcoAttachmentKeys.all, pcoId] as const,
};
