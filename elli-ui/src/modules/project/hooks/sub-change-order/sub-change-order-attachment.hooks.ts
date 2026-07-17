import { toastApiError } from '@/app/lib/toast-api-error';
import { scoAttachmentApi } from '@/modules/project/api/sub-change-order';
import { scoAttachmentKeys, scoKeys } from '@/modules/project/constants/sub-change-order';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type { SCODetail } from '@/modules/project/schemas/sub-change-order';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useAddSCOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, data }: { scoId: string; data: { documentId: string } }) =>
      scoAttachmentApi.add(scoId, data),
    onSuccess: async (_, { scoId }) => {
      await invalidateProjectQueries(qc, [scoAttachmentKeys.list(scoId), scoKeys.detail(scoId)]);
    },
    onError: (err) => toastApiError(err, 'Failed to add attachment.'),
  });
};

export const useRemoveSCOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, attachmentId }: { scoId: string; attachmentId: string }) =>
      scoAttachmentApi.remove(scoId, attachmentId),
    onSuccess: async (_, { scoId, attachmentId }) => {
      qc.setQueryData<Array<{ id: string }> | undefined>(
        scoAttachmentKeys.list(scoId),
        (attachments) => attachments?.filter((attachment) => attachment.id !== attachmentId)
      );
      qc.setQueryData<SCODetail | undefined>(scoKeys.detail(scoId), (sco) =>
        sco
          ? {
              ...sco,
              attachments: (sco.attachments ?? []).filter(
                (attachment) => attachment.id !== attachmentId
              ),
            }
          : sco
      );
      await invalidateProjectQueries(qc, [scoAttachmentKeys.list(scoId), scoKeys.detail(scoId)]);
    },
    onError: (err) => toastApiError(err, 'Failed to remove attachment.'),
  });
};
