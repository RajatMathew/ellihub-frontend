import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toastApiError } from '@app/lib/toast-api-error';
import { scoAttachmentApi } from '../api/sco-attachment.api';
import { scoAttachmentKeys } from '../constants/sco-attachment.keys';
import { scoKeys } from '../constants/sco.keys';

export const useAddSCOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, data }: { scoId: string; data: { fileId: string } }) =>
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
