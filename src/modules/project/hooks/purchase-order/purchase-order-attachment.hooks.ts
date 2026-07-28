import { toastApiError } from '@/app/lib/toast-api-error';
import { poAttachmentApi } from '@/modules/project/api/purchase-order';
import { poAttachmentKeys, poKeys } from '@/modules/project/constants/purchase-order';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type { PODetail } from '@/modules/project/schemas/purchase-order';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useAddPOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: { documentId: string } }) =>
      poAttachmentApi.add(poId, data),
    onSuccess: async (_, { poId }) => {
      await invalidateProjectQueries(qc, [poAttachmentKeys.list(poId), poKeys.detail(poId)]);
    },
    onError: (err) => toastApiError(err, 'Failed to add attachment.'),
  });
};

export const useRemovePOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, attachmentId }: { poId: string; attachmentId: string }) =>
      poAttachmentApi.remove(poId, attachmentId),
    onSuccess: async (_, { poId, attachmentId }) => {
      qc.setQueryData<Array<{ id: string }> | undefined>(
        poAttachmentKeys.list(poId),
        (attachments) => attachments?.filter((attachment) => attachment.id !== attachmentId)
      );
      qc.setQueryData<PODetail | undefined>(poKeys.detail(poId), (po) =>
        po
          ? {
              ...po,
              attachments: (po.attachments ?? []).filter(
                (attachment) => attachment.id !== attachmentId
              ),
            }
          : po
      );
      await invalidateProjectQueries(qc, [poAttachmentKeys.list(poId), poKeys.detail(poId)]);
    },
    onError: (err) => toastApiError(err, 'Failed to remove attachment.'),
  });
};
