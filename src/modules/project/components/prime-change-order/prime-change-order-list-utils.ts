import { formatDateTime } from '@/app/lib/helpers';
import {
  PRIME_CHANGE_ORDER_STATUS_DOT_CLASS,
} from '@/modules/project/constants/prime-change-order';
import type {
  PrimeChangeOrder,
  PrimeChangeOrderStatus,
} from '@/modules/project/schemas/prime-change-order';

export function formatPrimeChangeOrderDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return formatDateTime(value);
}

export function formatPrimeChangeOrderDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatPrimeChangeOrderCost(value?: number | null) {
  if (value == null) return '-';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPrimeChangeOrderTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getPrimeChangeOrderStatusDotClass(statusName: string) {
  return (
    PRIME_CHANGE_ORDER_STATUS_DOT_CLASS[statusName as PrimeChangeOrderStatus] ??
    'bg-muted-foreground'
  );
}

export function getPrimeChangeOrderFieldwireUrl(order: PrimeChangeOrder) {
  return `https://app.fieldwire.com/projects/${order.fieldwireProjectId}/change-orders/${order.fieldwireId}`;
}
