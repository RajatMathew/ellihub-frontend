import { toastApiError } from '@/app/lib/toast-api-error';
import {
  monthlyBillsApi,
  type MonthlyBillsQueryParams,
} from '@/modules/monthly-bills/api/monthly-bills.api';
import { monthlyBillsKeys } from '@/modules/monthly-bills/constants/monthly-bills.keys';
import type {
  MarkPaymentPayload,
  UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
    // Planned payment / Ready values re-seed correctly when navigating between months.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.all }),
    onError: (error) => toastApiError(error, 'Failed to save planned payment.'),
  });
};

export const useMarkPaymentMutation = () => {
  return useMutation({
    mutationFn: (payload: MarkPaymentPayload) => monthlyBillsApi.markPayment(payload),
    onError: (error) => toastApiError(error, 'Failed to record payment.'),
  });
};
