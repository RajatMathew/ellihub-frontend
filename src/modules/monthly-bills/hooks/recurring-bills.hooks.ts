import { toastApiError } from '@/app/lib/toast-api-error';
import {
  recurringBillsApi,
  type RecurringBillsQueryParams,
} from '@/modules/monthly-bills/api/recurring-bills.api';
import { monthlyBillsKeys } from '@/modules/monthly-bills/constants/monthly-bills.keys';
import type {
  CreateRecurringBillRulePayload,
  PayRecurringBillPayload,
  SkipRecurringBillMonthPayload,
  SkipRecurringBillPayload,
} from '@/modules/monthly-bills/schemas/recurring-bills.schema';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useInfiniteRecurringBillsQuery = (params: RecurringBillsQueryParams, enabled = true) =>
  useInfiniteQuery({
    queryKey: monthlyBillsKeys.recurringList(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => recurringBillsApi.list({ ...params, page: Number(pageParam) }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination.hasNextPage ? lastPage.meta.pagination.currentPage + 1 : undefined,
    enabled,
    staleTime: 60_000,
  });

// TEMP_RECURRING_BILLS_QA_CLOCK: mutation uses the same request-local date as the list.
export const useCreateRecurringBillRuleMutation = (qaDate?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRecurringBillRulePayload) =>
      recurringBillsApi.create(payload, qaDate),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.recurring() });
      toast.success('Recurring bill added.');
    },
    onError: (error) => toastApiError(error, 'Failed to add recurring bill.'),
  });
};

export const useUpdateRecurringBillRuleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      payload,
    }: {
      ruleId: string;
      payload: CreateRecurringBillRulePayload;
    }) => recurringBillsApi.update(ruleId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.recurring() });
      toast.success('Recurring bill updated.');
    },
    onError: (error) => toastApiError(error, 'Failed to update recurring bill.'),
  });
};

export const useToggleRecurringBillRuleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) =>
      recurringBillsApi.toggle(ruleId, { isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.recurring() });
    },
    onError: (error) => toastApiError(error, 'Failed to update recurring bill.'),
  });
};

export const useSkipRecurringBillMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: string; payload: SkipRecurringBillPayload }) =>
      recurringBillsApi.skip(ruleId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.recurring() });
      toast.success('Recurring bill skipped.');
    },
    onError: (error) => toastApiError(error, 'Failed to skip recurring bill.'),
  });
};

export const useSkipRecurringBillMonthMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: string; payload: SkipRecurringBillMonthPayload }) =>
      recurringBillsApi.skipMonth(ruleId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.recurring() });
      toast.success('Recurring bill month skipped.');
    },
    onError: (error) => toastApiError(error, 'Failed to skip recurring bill month.'),
  });
};

export const useDeleteRecurringBillRuleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => recurringBillsApi.delete(ruleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.recurring() });
      toast.success('Recurring bill deleted.');
    },
    onError: (error) => toastApiError(error, 'Failed to delete recurring bill.'),
  });
};

// TEMP_RECURRING_BILLS_QA_CLOCK: payment validation uses the visible QA date.
export const usePayRecurringBillMutation = (qaDate?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: string; payload: PayRecurringBillPayload }) =>
      recurringBillsApi.pay(ruleId, payload, qaDate),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.recurring() });
      toast.success('Recurring bill payment saved.');
    },
    onError: (error) => toastApiError(error, 'Failed to record recurring bill payment.'),
  });
};
