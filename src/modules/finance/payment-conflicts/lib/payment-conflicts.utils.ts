import type {
  PaymentConflict,
  PaymentConflictDiff,
  PaymentConflictItem,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { format, formatDistanceToNow } from 'date-fns';

export function formatConflictMoney(value: string | null | undefined, currency = 'USD') {
  if (value == null) return 'Not set';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatConflictDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy');
}

export function formatConflictShortDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d');
}

export function formatConflictTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : `${format(date, 'MMM d')} \u00b7 ${format(date, 'h:mm a')}`;
}

export function formatConflictRelativeTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : formatDistanceToNow(date, { addSuffix: true });
}

export function getReferenceLabel(conflict: PaymentConflict, value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const realmId = conflict.latestQuickBooks?.realmId ?? conflict.baseline.realmId;
  return conflict.referenceLabels[`${realmId}:${value}`] ?? null;
}

function formatGenericValue(value: unknown): string {
  if (value == null || value === '') return 'Not set';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value))
    return `${value.length} payment ${value.length === 1 ? 'line' : 'lines'}`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item != null && item !== '')
      .map(([key, item]) => `${key === 'currencyCode' ? 'Currency' : 'Rate'}: ${String(item)}`);
    return entries.join(' / ') || 'Not set';
  }
  return String(value);
}

export function formatDiffValue(
  conflict: PaymentConflict,
  diff: PaymentConflictDiff | PaymentConflictItem,
  side: 'elli' | 'quickbooks'
) {
  const value = side === 'elli' ? diff.elliValue : diff.quickBooksValue;
  const referenceFields = new Set(['VENDOR', 'BANK_ACCOUNT', 'CATEGORY']);
  if (referenceFields.has(diff.fieldKey)) {
    return getReferenceLabel(conflict, value) ?? formatGenericValue(value);
  }
  if (diff.fieldKey === 'PAYMENT_DATE')
    return formatConflictDate(typeof value === 'string' ? value : null);
  if (diff.fieldKey === 'TOTAL_AMOUNT' || diff.fieldKey === 'LINE_AMOUNT') {
    const currency =
      (side === 'elli'
        ? conflict.baseline.currencyCode
        : conflict.latestQuickBooks?.currencyCode) ?? 'USD';
    return formatConflictMoney(typeof value === 'string' ? value : String(value ?? ''), currency);
  }
  if (diff.fieldKey === 'TRANSACTION_MISSING') {
    return side === 'elli' ? 'Transaction exists' : 'Missing in QuickBooks';
  }
  return formatGenericValue(value);
}

export const resolutionActionLabels = {
  ACCEPTED_QUICKBOOKS: 'QuickBooks values accepted',
  AUTO_MATCHED_ELLI: 'Resolved automatically: QuickBooks value now matches Elli.',
  RECHECK_MATCHED_ELLI: 'Resolved after recheck: QuickBooks value now matches Elli.',
} as const;

export const detectionSourceLabels = {
  CDC: 'QuickBooks change feed',
  FULL_RECONCILIATION: 'Full reconciliation',
  DIRECT_RECHECK: 'Manual recheck',
  ACCEPT_PREFLIGHT: 'Resolution check',
} as const;
