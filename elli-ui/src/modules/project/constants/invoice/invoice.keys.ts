export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (projectId: string) => [...invoiceKeys.all, 'list', projectId] as const,
  stats: (projectId: string) => [...invoiceKeys.all, 'stats', projectId] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
  byPurchaseOrder: (poId: string) => [...invoiceKeys.all, 'by-po', poId] as const,
  statuses: () => [...invoiceKeys.all, 'statuses'] as const,
  summary: (projectId: string) => [...invoiceKeys.all, 'summary', projectId] as const,
};
