export const MONTHLY_BILL_TABS = [
  { label: 'Recurring', path: 'recurring', pageTitle: 'Recurring page' },
  { label: 'Subcontractor', path: 'subcontractor', pageTitle: 'Subcontractor page' },
  { label: 'Summary', path: 'summary', pageTitle: 'Summary page' },
] as const;

export const MONTHLY_BILLS_DEFAULT_PATH = '/app/monthly-bills/subcontractor';
export const MONTHLY_BILLS_ALLOWED_ROLES = new Set(['pm', 'accountant']);

export type MonthlyBillTabPath = (typeof MONTHLY_BILL_TABS)[number]['path'];
