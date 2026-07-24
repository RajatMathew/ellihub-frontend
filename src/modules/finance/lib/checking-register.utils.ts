import type {
  QuickBooksRegisterAccount,
  QuickBooksRegisterClr,
} from '@/modules/integrations/schemas/quickbooks.schema';

export function formatRegisterMoney(
  value: string | null | undefined,
  currencyCode?: string | null
) {
  if (value == null || value === '') return '-';
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatRegisterDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getAccountDescription(account: QuickBooksRegisterAccount) {
  return account.accountSubType || account.fullyQualifiedName || 'Bank account';
}

export function getClrLabel(value: QuickBooksRegisterClr | null) {
  if (value === 'CLEARED') return 'Cleared';
  if (value === 'RECONCILED') return 'Reconciled';
  if (value === 'UNCLEARED') return 'Uncleared';
  return '-';
}

export function getClrBadgeVariant(value: QuickBooksRegisterClr | null) {
  if (value === 'RECONCILED') return 'success';
  if (value === 'CLEARED') return 'info';
  return 'secondary';
}

export function getRegisterAmountClassName(value: string | null | undefined) {
  const numeric = Number(value ?? 0);
  if (numeric < 0) return 'text-destructive';
  if (numeric > 0) return 'text-success-soft-foreground';
  return 'text-foreground';
}
