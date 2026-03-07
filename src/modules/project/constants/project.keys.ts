export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
  invoiceAging: (id: string) => [...projectKeys.all, id, 'invoice-aging'] as const,
  invoiceSummary: (id: string) => [...projectKeys.all, id, 'invoice-summary'] as const,
};
