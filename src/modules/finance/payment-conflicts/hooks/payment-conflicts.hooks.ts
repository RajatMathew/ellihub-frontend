import { toastApiError } from '@/app/lib/toast-api-error';
import {
  paymentConflictsApi,
  type ListPaymentConflictsParams,
} from '@/modules/finance/payment-conflicts/api/payment-conflicts.api';
import { paymentConflictKeys } from '@/modules/finance/payment-conflicts/constants/payment-conflicts.keys';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const usePaymentConflictsQuery = (params: ListPaymentConflictsParams) =>
  useQuery({
    queryKey: paymentConflictKeys.list(params),
    queryFn: () => paymentConflictsApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useRecheckPaymentConflictMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentConflictsApi.recheck,
    onSuccess: async (conflict) => {
      await queryClient.invalidateQueries({ queryKey: paymentConflictKeys.all });
      toast.success(
        conflict.status === 'RESOLVED'
          ? 'Conflict resolved. Elli and QuickBooks now match.'
          : 'QuickBooks transaction rechecked.'
      );
    },
    onError: (error) => toastApiError(error, 'Unable to recheck the QuickBooks transaction.'),
  });
};

export const useAcceptQuickBooksPaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentConflictsApi.acceptQuickBooks,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: paymentConflictKeys.all });
      if (result.accepted) {
        toast.success('QuickBooks values accepted into Elli.');
      } else if (result.alreadyResolved) {
        toast.success('This conflict was already resolved.');
      } else {
        toast.error(result.blockedReasons?.[0] ?? 'These QuickBooks values cannot be accepted.');
      }
    },
    onError: (error) => toastApiError(error, 'Unable to accept the QuickBooks values.'),
  });
};

export const useSyncPaymentConflictsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentConflictsApi.sync,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: paymentConflictKeys.all });
      toast.success(
        `QuickBooks checked: ${result.conflictCount} conflicts found, ${result.resolvedCount} resolved.`
      );
    },
    onError: (error) => toastApiError(error, 'Unable to sync QuickBooks payment conflicts.'),
  });
};
