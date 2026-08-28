import { REGISTER_DEFAULT_RANGE_DAYS } from '@/modules/finance/constants/checking-register.constants';
import type { QuickBooksRegisterAccount } from '@/modules/integrations/schemas/quickbooks.schema';

/** `YYYY-MM-DD` in the viewer's own timezone, which is the day they mean. */
export function toRegisterDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The window the register falls back to when no range is picked.
 *
 * Deliberately not a filter default: it rolls with today, and a filter's
 * `defaultValue` is a fixed string. Keeping it here means an unfiltered register
 * carries no date params in the URL — so Clear has nothing to clear, and the
 * request still asks for a bounded window rather than the whole ledger.
 */
export function getDefaultRegisterRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - REGISTER_DEFAULT_RANGE_DAYS);

  return { endDate: toRegisterDateString(end), startDate: toRegisterDateString(start) };
}

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

export function getRegisterAmountClassName(value: string | null | undefined) {
  const numeric = Number(value ?? 0);
  if (numeric < 0) return 'text-destructive';
  if (numeric > 0) return 'text-success-soft-foreground';
  return 'text-foreground';
}
