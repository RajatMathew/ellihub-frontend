import { useListQuery } from '@/app/components/data-table';
import { activityLogKeys } from '@/app/hooks/use-activity-log';
import { toastApiError } from '@/app/lib/toast-api-error';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { poApi } from '@/modules/project/api/purchase-order';
import { projectKeys } from '@/modules/project/constants/project.keys';
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
import posthog from 'posthog-js';
import { toast } from 'sonner';

function invalidatePOQueries(queryClient: QueryClient, poId?: string, projectId?: string) {
  return invalidateProjectQueries(queryClient, [
    poKeys.all,
    ...(poId ? [poKeys.detail(poId)] : []),
    ...(projectId ? [projectKeys.budgets(projectId)] : []),
  ]);
}

/* ---- queries ---- */

export const usePOsQuery = (params?: ListPOsParams) =>
  useListQuery({
    queryKey: [...poKeys.list(), params],
    queryFn: () => poApi.list(params),
  });

export const usePOStatsQuery = (projectId: string) =>
  useQuery({
    queryKey: poKeys.stats(projectId),
    queryFn: () => poApi.stats(projectId),
    enabled: !!projectId,
  });

export const useNextPONumberQuery = (enabled = true) =>
  useQuery({
    queryKey: poKeys.nextNumber(),
    queryFn: () => poApi.getNextNumber(),
    enabled,
    staleTime: 0,
  });

export const usePONumberAvailabilityQuery = ({
  poNumberSuffix,
  excludeId,
  enabled = true,
}: {
  poNumberSuffix: string;
  excludeId?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: poKeys.numberAvailability(poNumberSuffix, excludeId),
    queryFn: () => poApi.checkNumberAvailability({ poNumberSuffix, excludeId }),
    enabled: enabled && poNumberSuffix.trim().length > 0,
    staleTime: 0,
  });

export const usePODetailQuery = (id: string) =>
  useQuery({
    queryKey: poKeys.detail(id),
    queryFn: () => poApi.get(id),
    enabled: !!id,
  });

/** One payment on the PO, in full; loaded only while its details are open. */
export const usePOPaymentDetailQuery = (poId: string, paymentId: string | null) =>
  useQuery({
    queryKey: poKeys.payment(poId, paymentId ?? ''),
    queryFn: () => poApi.getPayment(poId, paymentId!),
    enabled: !!poId && !!paymentId,
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
    onSuccess: async (created) => {
      posthog.capture('purchase_order_created', {
        purchase_order_id: created.id,
        project_id: created.projectId,
      });
      await invalidatePOQueries(qc, created.id, created.projectId);
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
      await invalidatePOQueries(qc, updated.id, updated.projectId);
    },
    onError: (err) => toastApiError(err, 'Failed to update purchase order.'),
  });
};

export const useIssuePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emailVendor }: { id: string; emailVendor?: boolean }) =>
      poApi.issue(id, { emailVendor }),
    onSuccess: async (updated, { id, emailVendor }) => {
      posthog.capture('purchase_order_issued', {
        purchase_order_id: id,
        email_vendor: emailVendor ?? false,
      });
      await invalidatePOQueries(qc, id, updated.projectId);
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
    onSuccess: async (updated, { id }) => {
      await invalidateProjectQueries(qc, [
        poKeys.all,
        poKeys.detail(id),
        scoKeys.all,
        projectKeys.budgets(updated.projectId),
      ]);
    },
    onError: (err) => toastApiError(err, 'Failed to cancel purchase order.'),
  });
};

export const useRecordDeliveryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; deliveryDate: string; notes?: string }) =>
      poApi.recordDelivery(id, data),
    onSuccess: async (updated, { id }) => {
      await invalidatePOQueries(qc, id, updated.projectId);
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
