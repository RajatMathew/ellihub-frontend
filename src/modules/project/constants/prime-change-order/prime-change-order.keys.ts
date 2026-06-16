import type { ListPrimeChangeOrderParams } from '@/modules/project/schemas/prime-change-order';

export const primeChangeOrderKeys = {
  all: ['prime-change-orders'] as const,
  list: (projectId: string, params?: ListPrimeChangeOrderParams) =>
    [...primeChangeOrderKeys.all, 'list', projectId, params] as const,
  statusSummary: (projectId: string) =>
    [...primeChangeOrderKeys.all, 'status-summary', projectId] as const,
  financialSummary: (projectId: string) =>
    [...primeChangeOrderKeys.all, 'financial-summary', projectId] as const,
  syncStatus: (projectId: string) =>
    [...primeChangeOrderKeys.all, 'sync-status', projectId] as const,
};
