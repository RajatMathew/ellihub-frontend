import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toastApiError } from '@/app/lib/toast-api-error';
import { contractAttachmentApi } from '@/modules/project/api/contract-attachment.api';
import { contractAttachmentKeys } from '@/modules/project/constants/contract-attachment.keys';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { projectKeys } from '@/modules/project/constants/project.keys';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';

export const useContractAttachmentsQuery = (projectId: string) =>
  useQuery({
    queryKey: contractAttachmentKeys.list(projectId),
    queryFn: () => contractAttachmentApi.list(projectId),
    enabled: !!projectId,
  });

export const usePrimeContractCandidatesQuery = (projectId: string, enabled = true) =>
  useQuery({
    queryKey: contractAttachmentKeys.candidates(projectId),
    queryFn: () => contractAttachmentApi.candidates(projectId),
    enabled: enabled && !!projectId,
  });

export const usePinPrimeContractsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      fileIds,
    }: {
      projectId: string;
      fileIds: string[];
    }) => contractAttachmentApi.pin(projectId, fileIds),
    onSuccess: async (_, { projectId }) => {
      await invalidateProjectQueries(qc, [
        contractAttachmentKeys.list(projectId),
        contractAttachmentKeys.candidates(projectId),
      ]);
      qc.invalidateQueries({ queryKey: filesKeys.all });
      toast.success('Prime contract pinned.');
    },
    onError: (error) => toastApiError(error, 'Failed to pin prime contract.'),
  });
};

export const useAddContractAttachmentMutation = () => {
  const mutation = usePinPrimeContractsMutation();

  return {
    ...mutation,
    mutateAsync: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { fileId: string };
    }) => mutation.mutateAsync({ projectId, fileIds: [data.fileId] }),
    mutate: (
      {
        projectId,
        data,
      }: {
        projectId: string;
        data: { fileId: string };
      },
      options?: Parameters<typeof mutation.mutate>[1]
    ) => mutation.mutate({ projectId, fileIds: [data.fileId] }, options),
  };
};

export const useUnpinPrimeContractsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      primeContractIds,
    }: {
      projectId: string;
      primeContractIds: string[];
    }) => contractAttachmentApi.unpin(projectId, primeContractIds),
    onSuccess: async (_, { projectId }) => {
      await invalidateProjectQueries(qc, [
        contractAttachmentKeys.list(projectId),
        contractAttachmentKeys.candidates(projectId),
        projectKeys.detail(projectId),
      ]);
      qc.invalidateQueries({ queryKey: filesKeys.all });
      toast.success('Prime contract unpinned.');
    },
    onError: (error) => toastApiError(error, 'Failed to unpin prime contract.'),
  });
};

export const useSetPrimeContractPrimaryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      primeContractIds,
      isPrimary,
    }: {
      projectId: string;
      primeContractIds: string[];
      isPrimary: boolean;
    }) => contractAttachmentApi.setPrimary(projectId, primeContractIds, isPrimary),
    onSuccess: async (_, { projectId, isPrimary }) => {
      await invalidateProjectQueries(qc, [
        contractAttachmentKeys.list(projectId),
        contractAttachmentKeys.candidates(projectId),
        projectKeys.detail(projectId),
      ]);
      qc.invalidateQueries({ queryKey: filesKeys.all });
      toast.success(isPrimary ? 'Prime contract marked primary.' : 'Primary mark removed.');
    },
    onError: (error) => toastApiError(error, 'Failed to update primary contract.'),
  });
};

export const useRemoveContractAttachmentMutation = () => {
  const mutation = useUnpinPrimeContractsMutation();

  return {
    ...mutation,
    mutateAsync: ({
      projectId,
      attachmentId,
    }: {
      projectId: string;
      attachmentId: string;
    }) => mutation.mutateAsync({ projectId, primeContractIds: [attachmentId] }),
    mutate: (
      {
        projectId,
        attachmentId,
      }: {
        projectId: string;
        attachmentId: string;
      },
      options?: Parameters<typeof mutation.mutate>[1]
    ) => mutation.mutate({ projectId, primeContractIds: [attachmentId] }, options),
  };
};

export const useSetPrimaryContractAttachmentMutation = () => {
  const mutation = useSetPrimeContractPrimaryMutation();

  return {
    ...mutation,
    mutateAsync: ({
      projectId,
      attachmentId,
    }: {
      projectId: string;
      attachmentId: string;
    }) => mutation.mutateAsync({ projectId, primeContractIds: [attachmentId], isPrimary: true }),
    mutate: (
      {
        projectId,
        attachmentId,
      }: {
        projectId: string;
        attachmentId: string;
      },
      options?: Parameters<typeof mutation.mutate>[1]
    ) =>
      mutation.mutate(
        { projectId, primeContractIds: [attachmentId], isPrimary: true },
        options
      ),
  };
};
