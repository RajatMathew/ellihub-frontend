import { toastApiError } from '@/app/lib/toast-api-error';
import { scoApi } from '@/modules/project/api/sub-change-order';
import { scoKeys } from '@/modules/project/constants/sub-change-order';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type {
  CreateSCOInput,
  ListSCOsParams,
  SCOLineItemInput,
  UpdateSCOInput,
} from '@/modules/project/schemas/sub-change-order';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function invalidateSCOQueries(queryClient: QueryClient, scoId?: string) {
  return invalidateProjectQueries(
    queryClient,
    scoId ? [scoKeys.all, scoKeys.detail(scoId)] : [scoKeys.all]
  );
}

/* ---- queries ---- */

export const useSCOsQuery = (params?: ListSCOsParams) =>
  useQuery({
    queryKey: [...scoKeys.list(), params],
    queryFn: () => scoApi.list(params),
    enabled: !!params?.projectId,
  });

export const useSCOSummaryQuery = (projectId: string) =>
  useQuery({
    queryKey: scoKeys.summary(projectId),
    queryFn: () => scoApi.summary(projectId),
    enabled: !!projectId,
  });

export const useSCOChangeTypesQuery = () =>
  useQuery({
    queryKey: scoKeys.changeTypes(),
    queryFn: () => scoApi.getChangeTypes(),
  });

export const useSCODetailQuery = (id: string) =>
  useQuery({
    queryKey: scoKeys.detail(id),
    queryFn: () => scoApi.getById(id),
    enabled: !!id,
  });

export const useSCOsByPurchaseOrderQuery = (poId: string) =>
  useQuery({
    queryKey: scoKeys.byPurchaseOrder(poId),
    queryFn: () => scoApi.listByPurchaseOrder(poId),
    enabled: !!poId,
  });

/* ---- mutations ---- */

export const useCreateSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSCOInput) => scoApi.create(data),
    onSuccess: async () => {
      await invalidateSCOQueries(qc);
      toast.success('SCO created.');
    },
    onError: (err) => toastApiError(err, 'Failed to create SCO.'),
  });
};

export const useUpdateSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSCOInput }) => scoApi.update(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateSCOQueries(qc, id);
      toast.success('SCO updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update SCO.'),
  });
};

export const useAddSCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, data }: { scoId: string; data: SCOLineItemInput }) =>
      scoApi.addLineItem(scoId, data),
    onSuccess: async (_, { scoId }) => {
      await invalidateSCOQueries(qc, scoId);
    },
  });
};

export const useUpdateSCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scoId,
      lineItemId,
      data,
    }: {
      scoId: string;
      lineItemId: string;
      data: SCOLineItemInput;
    }) => scoApi.updateLineItem(scoId, lineItemId, data),
    onSuccess: async (_, { scoId }) => {
      await invalidateSCOQueries(qc, scoId);
    },
  });
};

export const useRemoveSCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, lineItemId }: { scoId: string; lineItemId: string }) =>
      scoApi.removeLineItem(scoId, lineItemId),
    onSuccess: async (_, { scoId }) => {
      await invalidateSCOQueries(qc, scoId);
    },
  });
};

/* ---- workflow mutations ---- */

export const useApproveSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scoApi.approve(id),
    onSuccess: async (_, id) => {
      await invalidateSCOQueries(qc, id);
      toast.success('SCO approved.');
    },
    onError: (err) => toastApiError(err, 'Failed to approve SCO.'),
  });
};

export const useRejectSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) => scoApi.reject(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateSCOQueries(qc, id);
      toast.success('SCO rejected.');
    },
    onError: (err) => toastApiError(err, 'Failed to reject SCO.'),
  });
};

export const useVoidSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) =>
      scoApi.voidSCO(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateSCOQueries(qc, id);
      toast.success('SCO voided.');
    },
    onError: (err) => toastApiError(err, 'Failed to void SCO.'),
  });
};

export const useRevertSCOToDraftMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scoApi.revertToDraft(id),
    onSuccess: async (_, id) => {
      await invalidateSCOQueries(qc, id);
      toast.success('SCO reverted to draft.');
    },
    onError: (err) => toastApiError(err, 'Failed to revert SCO to draft.'),
  });
};
