import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toastApiError } from '@app/lib/toast-api-error';
import { poAttachmentApi } from '../api/po-attachment.api';
import { poAttachmentKeys } from '../constants/po-attachment.keys';
import { poKeys } from '../constants/po.keys';

export const useAddPOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: { documentId: string } }) =>
      poAttachmentApi.add(poId, data),
    onSuccess: (_, { poId }) => {
      qc.invalidateQueries({ queryKey: poAttachmentKeys.list(poId) });
      qc.invalidateQueries({ queryKey: poKeys.detail(poId) });
    },
    onError: (err) => toastApiError(err, 'Failed to add attachment.'),
  });
};

export const useRemovePOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, attachmentId }: { poId: string; attachmentId: string }) =>
      poAttachmentApi.remove(poId, attachmentId),
    onSuccess: (_, { poId }) => {
      qc.invalidateQueries({ queryKey: poAttachmentKeys.list(poId) });
      qc.invalidateQueries({ queryKey: poKeys.detail(poId) });
    },
    onError: (err) => toastApiError(err, 'Failed to remove attachment.'),
  });
};
