import { toastApiError } from '@/app/lib/toast-api-error';
import {
  monthlyBillsApi,
  type MonthlyBillsQueryParams,
} from '@/modules/monthly-bills/api/monthly-bills.api';
import type { UpsertPlannedPaymentPayload } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
