import { toastApiError } from '@/app/lib/toast-api-error';
import {
  monthlyBillsApi,
  type MonthlyBillsQueryParams,
} from '@/modules/monthly-bills/api/monthly-bills.api';
import type {
  MarkPaymentPayload,
  UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const monthlyBillsKeys = {
  all: ['monthly-bills'] as const,
  list: (params: MonthlyBillsQueryParams) => [...monthlyBillsKeys.all, 'list', params] as const,
};

export const useMonthlyBillsQuery = (params: MonthlyBillsQueryParams, enabled = true) =>
  useQuery({
    queryKey: monthlyBillsKeys.list(params),
    queryFn: () => monthlyBillsApi.listMonthlyBills(params),
    enabled,
  });

export const useUpsertPlannedPaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertPlannedPaymentPayload) =>
      monthlyBillsApi.upsertPlannedPayment(payload),
    // Keep every month's cached bills in sync with what was just persisted, so the
    // To Pay / Ready values re-seed correctly when navigating between months.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.all }),
    onError: (error) => toastApiError(error, 'Failed to save planned payment.'),
  });
};

export const useMarkPaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MarkPaymentPayload) => monthlyBillsApi.markPayment(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.all });
      toast.success('Payment recorded.');
    },
    onError: (error) => toastApiError(error, 'Failed to record payment.'),
  });
};
