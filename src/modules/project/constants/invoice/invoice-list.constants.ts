export const INVOICE_DEFAULT_PAGE_SIZE = 25;

export const INVOICE_SORT_BY_OPTIONS = [
  'createdAt',
  'invoiceNumber',
  'invoiceDate',
  'dueDate',
  'totalAmount',
] as const;

export type InvoiceSortByField = (typeof INVOICE_SORT_BY_OPTIONS)[number];
