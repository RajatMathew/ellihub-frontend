import type {
  RecurringBillGroup,
  RecurringBillItem,
} from '@/modules/monthly-bills/schemas/recurring-bills.schema';

export type RecurringBillAmountMode = 'fixed' | 'variable';

export type RecurringBillFrequency =
  | 'weekly'
  | 'monthly'
  | 'custom'
  | 'biweekly'
  | 'quarterly'
  | 'yearly';

export type RecurringBillScheduleTiming = 'start' | 'date' | 'end';
export type RecurringBillRule = RecurringBillItem;
export type RecurringBillRuleGroup = RecurringBillGroup;
