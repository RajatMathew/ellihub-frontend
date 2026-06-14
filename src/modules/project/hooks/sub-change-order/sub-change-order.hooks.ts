import { activityLogKeys } from '@/app/hooks/use-activity-log';
import { toastApiError } from '@/app/lib/toast-api-error';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { scoApi } from '@/modules/project/api/sub-change-order';
import { poKeys } from '@/modules/project/constants/purchase-order';
import { projectKeys } from '@/modules/project/constants/project.keys';
import { scoKeys } from '@/modules/project/constants/sub-change-order';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type {
  CreateSCOInput,
  GenerateSCOPdfInput,
  ListSCOsParams,
  SCOLineItemInput,
  UpdateSCOInput,
} from '@/modules/project/schemas/sub-change-order';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function invalidateSCOQueries(
  queryClient: QueryClient,
  scoId?: string,
  purchaseOrderId?: string | null
) {
  const queryKeys = scoId
    ? [scoKeys.all, scoKeys.detail(scoId), projectKeys.list()]
    : [scoKeys.all, projectKeys.list()];

  if (!purchaseOrderId) {
    return invalidateProjectQueries(queryClient, queryKeys);
  }

  return invalidateProjectQueries(queryClient, [
    ...queryKeys,
    scoKeys.byPurchaseOrder(purchaseOrderId),
    poKeys.all,
    poKeys.detail(purchaseOrderId),
    activityLogKeys.all,
  ]);
}

/* ---- queries ---- */

export const useSCOsQuery = (params?: ListSCOsParams) =>
  useQuery({
    queryKey: [...scoKeys.list(), params],
    queryFn: () => scoApi.list(params),
    enabled: !!params?.projectId,
  });

export const useSCOStatsQuery = (projectId: string) =>
  useQuery({
    queryKey: scoKeys.stats(projectId),
    queryFn: () => scoApi.stats(projectId),
    enabled: !!projectId,
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
    onSuccess: async (created, data) => {
      await invalidateSCOQueries(qc, created.id, created.purchaseOrderId ?? data.purchaseOrderId);
      toast.success('SCO created.');
    },
    onError: (err) => toastApiError(err, 'Failed to create SCO.'),
  });
};

export const useUpdateSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSCOInput }) => scoApi.update(id, data),
    onSuccess: async (updated, { id, data }) => {
      await invalidateSCOQueries(qc, id, updated.purchaseOrderId ?? data.purchaseOrderId);
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
      await invalidateProjectQueries(qc, [poKeys.all]);
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
      await invalidateProjectQueries(qc, [poKeys.all]);
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
      await invalidateProjectQueries(qc, [poKeys.all]);
    },
  });
};

/* ---- workflow mutations ---- */

export const useApproveSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scoApi.approve(id),
    onSuccess: async (updated, id) => {
      await invalidateSCOQueries(qc, id, updated.purchaseOrderId);
      toast.success('SCO approved.');
    },
    onError: (err) => toastApiError(err, 'Failed to approve SCO.'),
  });
};

export const useRejectSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) => scoApi.reject(id, data),
    onSuccess: async (updated, { id }) => {
      await invalidateSCOQueries(qc, id, updated.purchaseOrderId);
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
    onSuccess: async (updated, { id }) => {
      await invalidateSCOQueries(qc, id, updated.purchaseOrderId);
      toast.success('SCO voided.');
    },
    onError: (err) => toastApiError(err, 'Failed to void SCO.'),
  });
};

export const useGenerateSCOPdfMutation = () =>
  useMutation({
    mutationFn: ({
      id,
      data,
      scoNumber,
    }: {
      id: string;
      data: GenerateSCOPdfInput;
      scoNumber?: string | null;
    }) => scoApi.generatePdf(id, data, scoNumber),
    onError: (err) => toastApiError(err, 'Failed to generate SCO PDF.'),
  });

export const useSaveSCOPdfMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      scoNumber,
    }: {
      id: string;
      data: GenerateSCOPdfInput;
      scoNumber?: string | null;
      purchaseOrderId?: string | null;
    }) => scoApi.savePdf(id, data, scoNumber),
    onSuccess: async (_, { id, purchaseOrderId }) => {
      await invalidateProjectQueries(qc, [
        scoKeys.all,
        scoKeys.detail(id),
        filesKeys.all,
        activityLogKeys.all,
        ...(purchaseOrderId
          ? [scoKeys.byPurchaseOrder(purchaseOrderId), poKeys.detail(purchaseOrderId)]
          : []),
      ]);
      toast.success('PDF saved to Files.');
    },
    onError: (err) => toastApiError(err, 'Failed to save SCO PDF.'),
  });
};
