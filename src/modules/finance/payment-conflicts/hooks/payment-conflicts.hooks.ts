import { useEffect, useRef } from 'react';

import { toastApiError } from '@/app/lib/toast-api-error';
import {
  paymentConflictsApi,
  type ListPaymentConflictsParams,
} from '@/modules/finance/payment-conflicts/api/payment-conflicts.api';
import { paymentConflictKeys } from '@/modules/finance/payment-conflicts/constants/payment-conflicts.keys';
import type { PaymentConflictSyncStatusResponse } from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const usePaymentConflictsQuery = (params: ListPaymentConflictsParams) =>
  useQuery({
    queryKey: paymentConflictKeys.list(params),
    queryFn: () => paymentConflictsApi.list(params),
    placeholderData: keepPreviousData,
  });

export const usePaymentConflictSyncStatusQuery = () => {
  const queryClient = useQueryClient();
  const observedActiveRunId = useRef<string | null>(null);
  const query = useQuery({
    queryKey: paymentConflictKeys.syncStatus(),
    queryFn: paymentConflictsApi.getSyncStatus,
    refetchInterval: (currentQuery) => {
      const status = currentQuery.state.data;
      return status?.isActive ? status.pollAfterMs : false;
    },
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const status = query.data;
    const run = status?.run;
    if (!run) return;

    if (status.isActive) {
      observedActiveRunId.current = run.id;
      return;
    }
    if (observedActiveRunId.current !== run.id) return;
    observedActiveRunId.current = null;

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: paymentConflictKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: paymentConflictKeys.details() }),
    ]);

    if (run.status === 'SUCCESS') {
      toast.success(
        `QuickBooks checked: ${run.counts.conflictCount} conflicts found, ${run.counts.resolvedCount} resolved.`
      );
    } else if (run.status === 'PARTIAL') {
      toast.warning(`QuickBooks check completed with ${run.counts.failedCount} payment warnings.`);
    } else if (run.status === 'FAILED' || run.status === 'INTERRUPTED') {
      toast.error(run.error?.message ?? 'The QuickBooks check did not complete.');
    }
  }, [query.data, queryClient]);

  return query;
};

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
    mutationFn: paymentConflictsApi.acceptQuickBooksItems,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: paymentConflictKeys.all });
      if (result.accepted) {
        toast.success(
          `${result.acceptedItemIds.length} QuickBooks ${result.acceptedItemIds.length === 1 ? 'change' : 'changes'} accepted into Elli.`
        );
      } else if (result.alreadyResolved) {
        toast.success('The selected conflict was already resolved.');
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
      queryClient.setQueryData<PaymentConflictSyncStatusResponse>(
        paymentConflictKeys.syncStatus(),
        (current) =>
          current
            ? {
                ...current,
                run: result.run,
                isActive: true,
                pollAfterMs: result.pollAfterMs,
              }
            : current
      );
      await queryClient.invalidateQueries({ queryKey: paymentConflictKeys.syncStatus() });
      if (result.alreadyRunning) {
        toast.info('A QuickBooks payment check is already in progress.');
      } else {
        toast.success('QuickBooks payment check started.');
      }
    },
    onError: (error) => toastApiError(error, 'Unable to start the QuickBooks payment check.'),
  });
};
