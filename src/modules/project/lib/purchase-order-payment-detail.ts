import type { PaymentSource } from '@/app/lib/import-source';

type BadgeVariant = 'primary' | 'secondary' | 'info';

/** How a payment's type reads, with the badge colour its card already uses. */
export function describePaymentSource(source: PaymentSource): {
  label: string;
  variant: BadgeVariant;
} {
  switch (source) {
    case 'IMPORT':
      return { label: 'Imported', variant: 'info' };
    case 'MANUAL':
      return { label: 'Manual', variant: 'secondary' };
    default:
      return { label: 'QuickBooks', variant: 'primary' };
  }
}

/**
 * Whether QuickBooks still agrees with a payment made through it, in words.
 * The tracking status is a server enum; one this client does not know yet
 * reads as unknown rather than breaking the view.
 */
export function describeQuickBooksSync(trackingStatus: string, openConflictCount: number): string {
  switch (trackingStatus) {
    case 'TRACKED':
      return 'In sync with QuickBooks';
    case 'CONFLICT':
      return openConflictCount === 1
        ? 'Changed in QuickBooks - 1 open conflict'
        : `Changed in QuickBooks - ${openConflictCount} open conflicts`;
    case 'MISSING':
      return 'Not found in QuickBooks';
    case 'LEGACY_UNTRACKED':
    case 'NOT_TRACKED':
      return 'Not tracked';
    default:
      return 'Unknown';
  }
}
