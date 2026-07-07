export const contactsKeys = {
  all: ['contacts'] as const,
  list: () => [...contactsKeys.all, 'list'] as const,
  detail: (id: string) => [...contactsKeys.all, id] as const,
  kpis: () => [...contactsKeys.all, 'kpis'] as const,
  roles: () => [...contactsKeys.all, 'roles'] as const,
  vendorLinks: (contactId: string) =>
    [...contactsKeys.all, contactId, 'vendor-links'] as const,
  gcLinks: (contactId: string) =>
    [...contactsKeys.all, contactId, 'gc-links'] as const,
};
