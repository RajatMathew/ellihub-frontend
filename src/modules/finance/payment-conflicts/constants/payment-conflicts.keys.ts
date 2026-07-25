import type { ListPaymentConflictsParams } from '@/modules/finance/payment-conflicts/api/payment-conflicts.api';

export const paymentConflictKeys = {
  all: ['quickbooks-payment-conflicts'] as const,
  lists: () => [...paymentConflictKeys.all, 'list'] as const,
  list: (params: ListPaymentConflictsParams) => [...paymentConflictKeys.lists(), params] as const,
  details: () => [...paymentConflictKeys.all, 'detail'] as const,
  detail: (conflictId: string) => [...paymentConflictKeys.details(), conflictId] as const,
};
