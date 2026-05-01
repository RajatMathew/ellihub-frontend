export const poAttachmentKeys = {
  all: ['po-attachments'] as const,
  list: (poId: string) => [...poAttachmentKeys.all, poId] as const,
};
