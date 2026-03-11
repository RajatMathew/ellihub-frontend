import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { contractAttachmentApi } from '@modules/project/api/contract-attachment.api';
import { contractAttachmentKeys } from '@modules/project/constants/contract-attachment.keys';
import { projectContractKeys } from '@modules/project/constants/project-contract.keys';

export const useContractAttachmentsQuery = (projectId: string) =>
  useQuery({
    queryKey: contractAttachmentKeys.list(projectId),
    queryFn: () => contractAttachmentApi.list(projectId),
    enabled: !!projectId,
  });

export const useAddContractAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { fileId: string };
    }) => contractAttachmentApi.add(projectId, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: contractAttachmentKeys.list(projectId) });
      qc.invalidateQueries({ queryKey: projectContractKeys.detail(projectId) });
    },
    onError: () => toast.error('Failed to add attachment.'),
  });
};

export const useRemoveContractAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      attachmentId,
    }: {
      projectId: string;
      attachmentId: string;
    }) => contractAttachmentApi.remove(projectId, attachmentId),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: contractAttachmentKeys.list(projectId) });
    },
    onError: () => toast.error('Failed to remove attachment.'),
  });
};
