export const INVOICE_DEFAULT_PAGE_SIZE = 25;
export const INVOICE_SEARCH_DEBOUNCE_MS = 300;

export const INVOICE_SORT_BY_OPTIONS = [
  'createdAt',
  'invoiceNumber',
  'invoiceDate',
  'dueDate',
  'totalAmount',
] as const;

export type InvoiceSortByField = (typeof INVOICE_SORT_BY_OPTIONS)[number];

export function isInvoiceSortByField(value: string | null): value is InvoiceSortByField {
  return INVOICE_SORT_BY_OPTIONS.includes(value as InvoiceSortByField);
}
