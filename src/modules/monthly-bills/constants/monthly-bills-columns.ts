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
  { key: 'toPay', label: 'Planned payment' },
  { key: 'ready', label: 'Ready' },
] as const;

export type MonthlyBillColumnKey = (typeof MONTHLY_BILL_COLUMNS)[number]['key'];

/** Columns whose footer cell shows a currency total rather than an empty cell. */
export const MONTHLY_BILL_VALUE_COLUMNS = new Set<MonthlyBillColumnKey>([
  'paidThisMonth',
  'original',
  'totalPaid',
  'balance',
  'toPay',
]);

export function getDefaultMonthlyBillColumns() {
  return new Set<MonthlyBillColumnKey>(MONTHLY_BILL_COLUMNS.map((column) => column.key));
}

export function getMonthlyBillRenderedColumns(visibleColumns: Set<MonthlyBillColumnKey>) {
  return MONTHLY_BILL_COLUMNS.filter((column) => {
    if (column.key === 'issueDate') return false;
    if (column.key === 'paidThisMonth') return false;
    if (column.key === 'vendor') {
      return visibleColumns.has('vendor') || visibleColumns.has('issueDate');
    }
    if (column.key === 'payments') {
      return visibleColumns.has('payments') || visibleColumns.has('paidThisMonth');
    }
    return visibleColumns.has(column.key);
  });
}
