export type RecurringBillAmountMode = 'fixed' | 'variable' | 'requires-entry';

export type RecurringBillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

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
  amountMode: RecurringBillAmountMode;
  defaultAmount: number;
  dueDay: number;
  isActive: boolean;
  lastPaidLabel?: string;
  lastPaidAmount?: number;
  notes?: string;
}
