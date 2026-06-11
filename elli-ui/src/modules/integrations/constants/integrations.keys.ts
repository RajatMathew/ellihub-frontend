export const integrationsKeys = {
  all: ['integrations'] as const,
  quickBooks: () => [...integrationsKeys.all, 'quickbooks'] as const,
  quickBooksStatus: () => [...integrationsKeys.quickBooks(), 'status'] as const,
  quickBooksReferenceSync: () => [...integrationsKeys.quickBooks(), 'reference-sync'] as const,
  quickBooksReferenceSyncStatus: () =>
    [...integrationsKeys.quickBooksReferenceSync(), 'status'] as const,
};
