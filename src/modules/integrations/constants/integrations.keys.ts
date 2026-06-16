export const integrationsKeys = {
  all: ['integrations'] as const,
  quickBooks: () => [...integrationsKeys.all, 'quickbooks'] as const,
  quickBooksStatus: () => [...integrationsKeys.quickBooks(), 'status'] as const,
  quickBooksReferenceSync: () => [...integrationsKeys.quickBooks(), 'reference-sync'] as const,
  quickBooksReferenceSyncStatus: () =>
    [...integrationsKeys.quickBooksReferenceSync(), 'status'] as const,
  quickBooksBankAccounts: () => [...integrationsKeys.quickBooks(), 'bank-accounts'] as const,
  quickBooksCategories: () => [...integrationsKeys.quickBooks(), 'categories'] as const,
  quickBooksVendors: () => [...integrationsKeys.quickBooks(), 'vendors'] as const,
  quickBooksVendorOptions: (params?: unknown) =>
    [...integrationsKeys.quickBooks(), 'vendor-options', params] as const,
  quickBooksVendorMappings: () => [...integrationsKeys.quickBooks(), 'vendor-mappings'] as const,
};
