export const integrationsKeys = {
  all: ['integrations'] as const,
  quickBooks: () => [...integrationsKeys.all, 'quickbooks'] as const,
  quickBooksStatus: () => [...integrationsKeys.quickBooks(), 'status'] as const,
  quickBooksTransactions: () => [...integrationsKeys.quickBooks(), 'transactions'] as const,
};
