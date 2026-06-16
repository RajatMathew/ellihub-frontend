import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toastApiError } from '@/app/lib/toast-api-error';
import { primeChangeOrderApi } from '@/modules/project/api/prime-change-order';
import { primeChangeOrderKeys } from '@/modules/project/constants/prime-change-order';
import { projectKeys } from '@/modules/project/constants/project.keys';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type { ListPrimeChangeOrderParams } from '@/modules/project/schemas/prime-change-order';

export const usePrimeChangeOrdersQuery = (params: ListPrimeChangeOrderParams) =>
  useQuery({
    queryKey: primeChangeOrderKeys.list(params.projectId, params),
    queryFn: () => primeChangeOrderApi.list(params),
    enabled: !!params.projectId,
  });

export const usePrimeChangeOrderSyncStatusQuery = (projectId: string) =>
  useQuery({
    queryKey: primeChangeOrderKeys.syncStatus(projectId),
    queryFn: () => primeChangeOrderApi.getSyncStatus(projectId),
    enabled: !!projectId,
  });

export const usePrimeChangeOrderStatusSummaryQuery = (projectId: string) =>
  useQuery({
    queryKey: primeChangeOrderKeys.statusSummary(projectId),
    queryFn: () => primeChangeOrderApi.getStatusSummary(projectId),
    enabled: !!projectId,
  });

export const usePrimeChangeOrderFinancialSummaryQuery = (projectId: string) =>
  useQuery({
    queryKey: primeChangeOrderKeys.financialSummary(projectId),
    queryFn: () => primeChangeOrderApi.getFinancialSummary(projectId),
    enabled: !!projectId,
  });

export const useSyncPrimeChangeOrdersMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => primeChangeOrderApi.sync(projectId),
    onSuccess: async (result, projectId) => {
      await invalidateProjectQueries(qc, [
        primeChangeOrderKeys.all,
        primeChangeOrderKeys.statusSummary(projectId),
        primeChangeOrderKeys.financialSummary(projectId),
        primeChangeOrderKeys.syncStatus(projectId),
        projectKeys.list(),
      ]);
      toast.success(
        `Synced ${result.summary.totalReceived} Fieldwire change order${
          result.summary.totalReceived === 1 ? '' : 's'
        }.`,
      );
    },
    onError: (err) => toastApiError(err, 'Failed to sync Fieldwire change orders.'),
  });
};
