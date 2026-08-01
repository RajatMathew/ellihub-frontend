import type { ReactNode } from 'react';

import type { PaymentConflictItem } from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';

export interface LineTableColumn {
  label: string;
  headClassName?: string;
  cellClassName?: string;
}

export interface LineTableRow {
  key: string;
  cells: ReactNode[];
}

export type LineComparisonKind = NonNullable<PaymentConflictItem['lineComparisonKind']>;

export const LINE_COMPARISON_COPY: Record<
  LineComparisonKind,
  { heading: string; detailLabel: string }
> = {
  CATEGORY_DETAILS: {
    heading: 'Category Details comparison',
    detailLabel: 'Category Details',
  },
  ITEM_DETAILS: {
    heading: 'Item Details comparison',
    detailLabel: 'Item Details',
  },
};

export const CATEGORY_COLUMNS: LineTableColumn[] = [
  { label: 'Category', cellClassName: 'font-medium' },
  { label: 'Description', cellClassName: 'max-w-56' },
  {
    label: 'Amount',
    headClassName: 'text-right',
    cellClassName: 'text-right font-semibold tabular-nums',
  },
  { label: 'Billable' },
  { label: 'Customer / Project', cellClassName: 'max-w-48' },
];

export const ITEM_COLUMNS: LineTableColumn[] = [
  { label: 'Product / Service', cellClassName: 'font-medium' },
  { label: 'Description', cellClassName: 'max-w-56' },
  {
    label: 'Qty',
    headClassName: 'text-right',
    cellClassName: 'text-right tabular-nums',
  },
  {
    label: 'Rate',
    headClassName: 'text-right',
    cellClassName: 'text-right tabular-nums',
  },
  {
    label: 'Amount',
    headClassName: 'text-right',
    cellClassName: 'text-right font-semibold tabular-nums',
  },
  { label: 'Billable' },
  { label: 'Customer / Project', cellClassName: 'max-w-48' },
];
