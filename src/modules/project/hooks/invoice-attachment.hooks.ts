import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toastApiError } from '@app/lib/toast-api-error';
import { invoiceAttachmentApi } from '@modules/project/api/invoice-attachment.api';
import { invoiceAttachmentKeys } from '@modules/project/constants/invoice-attachment.keys';
import { invoiceKeys } from '@modules/project/constants/invoice.keys';

export const useAddInvoiceAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: { fileId: string } }) =>
      invoiceAttachmentApi.add(invoiceId, data),
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: invoiceAttachmentKeys.list(invoiceId) });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
    onError: (err) => toastApiError(err, 'Failed to add attachment.'),
  });
};

export const useRemoveInvoiceAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, attachmentId }: { invoiceId: string; attachmentId: string }) =>
      invoiceAttachmentApi.remove(invoiceId, attachmentId),
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: invoiceAttachmentKeys.list(invoiceId) });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
    onError: (err) => toastApiError(err, 'Failed to remove attachment.'),
  });
};
