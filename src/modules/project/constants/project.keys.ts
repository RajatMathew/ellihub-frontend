export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  stats: () => [...projectKeys.all, 'stats'] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
  fieldwireProjects: () => [...projectKeys.all, 'fieldwire', 'projects'] as const,
  costCodes: (id: string) => [...projectKeys.detail(id), 'cost-codes'] as const,
  employeeOptions: (id: string) => [...projectKeys.detail(id), 'employee-options'] as const,
  invoiceAging: (id: string) => [...projectKeys.all, id, 'invoice-aging'] as const,
  invoiceSummary: (id: string) => [...projectKeys.all, id, 'invoice-summary'] as const,
};
