import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toastApiError } from '@/app/lib/toast-api-error';
import { invoiceAttachmentApi } from '@/modules/project/api/invoice';
import { invoiceAttachmentKeys, invoiceKeys } from '@/modules/project/constants/invoice';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';

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
    onSuccess: async (_, { invoiceId }) => {
      await invalidateProjectQueries(qc, [
        invoiceAttachmentKeys.list(invoiceId),
        invoiceKeys.detail(invoiceId),
      ]);
    },
    onError: (err) => toastApiError(err, 'Failed to remove attachment.'),
  });
};
