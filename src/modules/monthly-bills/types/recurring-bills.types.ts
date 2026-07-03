export type RecurringBillAmountMode = 'fixed' | 'variable' | 'requires-entry';

export type RecurringBillFrequency =
  | 'weekly'
  | 'monthly'
  | 'custom'
  | 'biweekly'
  | 'quarterly'
  | 'yearly';

export type RecurringBillScheduleTiming = 'start' | 'date' | 'end';

export interface RecurringBillRule {
  id: string;
  name: string;
  vendorId: string;
  vendorName: string;
  categoryId?: string;
  categoryName?: string;
  bankAccountId?: string;
  bankAccountName?: string;
  frequency: RecurringBillFrequency;
  scheduleTiming?: RecurringBillScheduleTiming;
  weeklyDay?: number;
  customIntervalMonths?: number;
  amountMode: RecurringBillAmountMode;
  defaultAmount: number;
  dueDay: number;
  isActive: boolean;
  lastPaidCycleLabel?: string;
  lastPaidLabel?: string;
  lastPaidAmount?: number;
  lastInvoiceFile?: File;
  notes?: string;
}
