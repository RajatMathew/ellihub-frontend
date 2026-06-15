import type { PrimeChangeOrderStatus } from '@/modules/project/schemas/prime-change-order';

export const PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE = 25;
export const PRIME_CHANGE_ORDER_SEARCH_DEBOUNCE_MS = 300;

export const PRIME_CHANGE_ORDER_SORT_BY_OPTIONS = [
  'referenceNumber',
  'name',
  'statusName',
  'dueDate',
  'totalCost',
  'fieldwireCreatedAt',
  'fieldwireUpdatedAt',
  'lastSyncedAt',
] as const;

export type PrimeChangeOrderSortByField =
  (typeof PRIME_CHANGE_ORDER_SORT_BY_OPTIONS)[number];

export function isPrimeChangeOrderSortByField(
  value: string | null,
): value is PrimeChangeOrderSortByField {
  return PRIME_CHANGE_ORDER_SORT_BY_OPTIONS.includes(value as PrimeChangeOrderSortByField);
}

export const PRIME_CHANGE_ORDER_STATUS_DOT_CLASS: Record<PrimeChangeOrderStatus, string> = {
  Draft: 'bg-fieldwire-status-draft',
  Requested: 'bg-fieldwire-status-neutral',
  'Pending Revision': 'bg-fieldwire-status-neutral',
  'Pending Approval': 'bg-fieldwire-status-pending',
  Approved: 'bg-fieldwire-status-approved',
  Rejected: 'bg-fieldwire-status-rejected',
  Void: 'bg-fieldwire-status-neutral',
};
