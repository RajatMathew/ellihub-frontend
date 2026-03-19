import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { pcoAttachmentApi } from '@modules/project/api/pco-attachment.api';
import { pcoAttachmentKeys } from '@modules/project/constants/pco-attachment.keys';
import { pcoKeys } from '@modules/project/constants/pco.keys';

export const usePCOAttachmentsQuery = (pcoId: string) =>
  useQuery({
    queryKey: pcoAttachmentKeys.list(pcoId),
    queryFn: () => pcoAttachmentApi.list(pcoId),
    enabled: !!pcoId,
  });

export const useAddPCOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pcoId,
      data,
    }: {
      pcoId: string;
      data: { fileId: string };
    }) => pcoAttachmentApi.add(pcoId, data),
    onSuccess: (_, { pcoId }) => {
      qc.invalidateQueries({ queryKey: pcoAttachmentKeys.list(pcoId) });
      qc.invalidateQueries({ queryKey: pcoKeys.detail(pcoId) });
    },
    onError: () => toast.error('Failed to add attachment.'),
  });
};

export const useRemovePCOAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pcoId,
      attachmentId,
    }: {
      pcoId: string;
      attachmentId: string;
    }) => pcoAttachmentApi.remove(pcoId, attachmentId),
    onSuccess: (_, { pcoId }) => {
      qc.invalidateQueries({ queryKey: pcoAttachmentKeys.list(pcoId) });
      qc.invalidateQueries({ queryKey: pcoKeys.detail(pcoId) });
    },
    onError: () => toast.error('Failed to remove attachment.'),
  });
};
