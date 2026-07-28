import { toastApiError } from '@/app/lib/toast-api-error';
import { invoiceAttachmentApi } from '@/modules/project/api/invoice';
import { invoiceAttachmentKeys, invoiceKeys } from '@/modules/project/constants/invoice';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type { InvoiceDetail } from '@/modules/project/schemas/invoice';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useAddInvoiceAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: { documentId: string } }) =>
      invoiceAttachmentApi.add(invoiceId, data),
    onSuccess: async (_, { invoiceId }) => {
      await invalidateProjectQueries(qc, [
        invoiceAttachmentKeys.list(invoiceId),
        invoiceKeys.detail(invoiceId),
      ]);
    },
    onError: (err) => toastApiError(err, 'Failed to add attachment.'),
  });
};

export const useRemoveInvoiceAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, attachmentId }: { invoiceId: string; attachmentId: string }) =>
      invoiceAttachmentApi.remove(invoiceId, attachmentId),
    onSuccess: async (_, { invoiceId, attachmentId }) => {
      qc.setQueryData<Array<{ id: string }> | undefined>(
        invoiceAttachmentKeys.list(invoiceId),
        (attachments) => attachments?.filter((attachment) => attachment.id !== attachmentId)
      );
      qc.setQueryData<InvoiceDetail | undefined>(invoiceKeys.detail(invoiceId), (invoice) =>
        invoice
          ? {
              ...invoice,
              attachments: (invoice.attachments ?? []).filter(
                (attachment) => attachment.id !== attachmentId
              ),
            }
          : invoice
      );
      await invalidateProjectQueries(qc, [
        invoiceAttachmentKeys.list(invoiceId),
        invoiceKeys.detail(invoiceId),
      ]);
    },
    onError: (err) => toastApiError(err, 'Failed to remove attachment.'),
  });
};
