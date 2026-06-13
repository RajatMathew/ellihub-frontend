// Toggleable data columns for the monthly bills table, in display order. The leading select
// checkbox and the trailing Mark Payment action are structural and always rendered.
export const MONTHLY_BILL_COLUMNS = [
  { key: 'poNumber', label: 'PO #' },
  { key: 'issueDate', label: 'PO Issue Date' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'payments', label: 'Payments' },
  { key: 'paidThisMonth', label: 'Paid This Month' },
  { key: 'original', label: 'Original' },
  { key: 'totalPaid', label: 'Total Paid' },
  { key: 'balance', label: 'Balance' },
  { key: 'toPay', label: 'To Pay' },
  { key: 'ready', label: 'Ready' },
] as const;

export type MonthlyBillColumnKey = (typeof MONTHLY_BILL_COLUMNS)[number]['key'];

/** Columns whose footer cell shows a currency total rather than an empty cell. */
export const MONTHLY_BILL_VALUE_COLUMNS = new Set<MonthlyBillColumnKey>([
  'paidThisMonth',
  'totalPaid',
  'toPay',
]);

export const MONTHLY_BILL_COLUMN_KEYS = MONTHLY_BILL_COLUMNS.map((column) => column.key);

export function getDefaultMonthlyBillColumns() {
  return new Set<MonthlyBillColumnKey>(MONTHLY_BILL_COLUMN_KEYS);
}
