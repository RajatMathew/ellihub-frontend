export const invoiceAttachmentKeys = {
  all: ['invoice-attachments'] as const,
  list: (invoiceId: string) => [...invoiceAttachmentKeys.all, invoiceId] as const,
};
