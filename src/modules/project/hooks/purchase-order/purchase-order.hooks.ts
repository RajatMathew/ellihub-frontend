import { activityLogKeys } from '@/app/hooks/use-activity-log';
import { toastApiError } from '@/app/lib/toast-api-error';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { poApi } from '@/modules/project/api/purchase-order';
import { poKeys } from '@/modules/project/constants/purchase-order';
import { scoKeys } from '@/modules/project/constants/sub-change-order';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type {
  CreatePOInput,
  GeneratePOPdfInput,
  ListPOsParams,
  POLineItemInput,
} from '@/modules/project/schemas/purchase-order';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function invalidatePOQueries(queryClient: QueryClient, poId?: string) {
  return invalidateProjectQueries(
    queryClient,
    poId ? [poKeys.all, poKeys.detail(poId)] : [poKeys.all]
  );
}

/* ---- queries ---- */

export const usePOsQuery = (params?: ListPOsParams) =>
  useQuery({
    queryKey: [...poKeys.list(), params],
    queryFn: () => poApi.list(params),
  });

export const usePOStatsQuery = (projectId: string) =>
  useQuery({
    queryKey: poKeys.stats(projectId),
    queryFn: () => poApi.stats(projectId),
    enabled: !!projectId,
  });

export const usePODetailQuery = (id: string) =>
  useQuery({
    queryKey: poKeys.detail(id),
    queryFn: () => poApi.get(id),
    enabled: !!id,
  });

export const usePOPdfDefaultTermsQuery = () =>
  useQuery({
    queryKey: poKeys.pdfDefaultTerms(),
    queryFn: () => poApi.getPdfDefaultTerms(),
    staleTime: 5 * 60 * 1000,
  });

export const usePOPdfTermsOptionsQuery = () =>
  useQuery({
    queryKey: poKeys.pdfTermsOptions(),
    queryFn: () => poApi.getPdfTermsOptions(),
    staleTime: 5 * 60 * 1000,
  });

/* ---- mutations ---- */

export const useCreatePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOInput) => poApi.create(data),
    onSuccess: async () => {
      await invalidatePOQueries(qc);
    },
    onError: (err) => toastApiError(err, 'Failed to create purchase order.'),
  });
};

export const useUpdatePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePOInput> }) =>
      poApi.update(id, data),
    onSuccess: async (updated) => {
      await invalidatePOQueries(qc, updated.id);
    },
    onError: (err) => toastApiError(err, 'Failed to update purchase order.'),
  });
};

export const useIssuePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emailVendor }: { id: string; emailVendor?: boolean }) =>
      poApi.issue(id, { emailVendor }),
    onSuccess: async (_, { id }) => {
      await invalidatePOQueries(qc, id);
    },
    onError: (err) => toastApiError(err, 'Failed to issue purchase order.'),
  });
};

export const useCancelPOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      reason: string;
      notifyVendor?: boolean;
      confirmInvoices?: boolean;
      confirmSCOs?: boolean;
    }) => poApi.cancel(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateProjectQueries(qc, [poKeys.all, poKeys.detail(id), scoKeys.all]);
    },
    onError: (err) => toastApiError(err, 'Failed to cancel purchase order.'),
  });
};

export const useRecordDeliveryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; deliveryDate: string; notes?: string }) =>
      poApi.recordDelivery(id, data),
    onSuccess: async (_, { id }) => {
      await invalidatePOQueries(qc, id);
    },
    onError: (err) => toastApiError(err, 'Failed to record delivery.'),
  });
};

export const useGeneratePOPdfMutation = () =>
  useMutation({
    mutationFn: ({
      id,
      data,
      poNumber,
    }: {
      id: string;
      data: GeneratePOPdfInput;
      poNumber?: string | null;
    }) => poApi.generatePdf(id, data, poNumber),
    onError: (err) => toastApiError(err, 'Failed to generate purchase order PDF.'),
  });

export const useSavePOPdfMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      poNumber,
    }: {
      id: string;
      data: GeneratePOPdfInput;
      poNumber?: string | null;
    }) => poApi.savePdf(id, data, poNumber),
    onSuccess: async (_, { id }) => {
      await invalidateProjectQueries(qc, [
        poKeys.all,
        poKeys.detail(id),
        filesKeys.all,
        activityLogKeys.all,
      ]);
      toast.success('PDF saved to Files.');
    },
    onError: (err) => toastApiError(err, 'Failed to save purchase order PDF.'),
  });
};

/* ---- line item mutations ---- */

export const useAddPOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: POLineItemInput }) =>
      poApi.addLineItem(poId, data),
    onSuccess: async (_, { poId }) => {
      await invalidatePOQueries(qc, poId);
    },
    onError: (err) => toastApiError(err, 'Failed to add line item.'),
  });
};

export const useRemovePOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, lineItemId }: { poId: string; lineItemId: string }) =>
      poApi.removeLineItem(poId, lineItemId),
    onSuccess: async (_, { poId }) => {
      await invalidatePOQueries(qc, poId);
    },
    onError: (err) => toastApiError(err, 'Failed to remove line item.'),
  });
};
