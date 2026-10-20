export const MONTHLY_BILL_TABS = [
  { label: 'Recurring', path: 'recurring' },
  { label: 'Subcontractor', path: 'subcontractor' },
  { label: 'Summary', path: 'summary' },
] as const;

export const MONTHLY_BILLS_DEFAULT_PATH = '/app/monthly-bills/subcontractor';
export const MONTHLY_BILLS_ALLOWED_ROLES = new Set(['pm', 'accountant', 'ap']);

export type MonthlyBillTabPath = (typeof MONTHLY_BILL_TABS)[number]['path'];
