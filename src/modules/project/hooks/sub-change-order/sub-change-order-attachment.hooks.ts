import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toastApiError } from '@/app/lib/toast-api-error';
import { scoAttachmentApi } from '@/modules/project/api/sub-change-order';
import { scoAttachmentKeys, scoKeys } from '@/modules/project/constants/sub-change-order';

export const useAddSCOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, data }: { scoId: string; data: { documentId: string } }) =>
      scoAttachmentApi.add(scoId, data),
    onSuccess: (_, { scoId }) => {
      qc.invalidateQueries({ queryKey: scoAttachmentKeys.list(scoId) });
      qc.invalidateQueries({ queryKey: scoKeys.detail(scoId) });
    },
    onError: (err) => toastApiError(err, 'Failed to add attachment.'),
  });
};

export const useRemoveSCOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, attachmentId }: { scoId: string; attachmentId: string }) =>
      scoAttachmentApi.remove(scoId, attachmentId),
    onSuccess: (_, { scoId }) => {
      qc.invalidateQueries({ queryKey: scoAttachmentKeys.list(scoId) });
      qc.invalidateQueries({ queryKey: scoKeys.detail(scoId) });
    },
    onError: (err) => toastApiError(err, 'Failed to remove attachment.'),
  });
};
