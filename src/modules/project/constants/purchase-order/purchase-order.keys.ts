export const poKeys = {
  all: ['purchase-orders'] as const,
  list: () => [...poKeys.all, 'list'] as const,
  detail: (id: string) => [...poKeys.all, id] as const,
  quickBooksPayments: (id: string) => [...poKeys.detail(id), 'quickbooks-payments'] as const,
  quickBooksPaymentOptions: (id: string) =>
    [...poKeys.detail(id), 'quickbooks-payment-options'] as const,
  summary: (projectId: string) => [...poKeys.all, 'summary', projectId] as const,
};
