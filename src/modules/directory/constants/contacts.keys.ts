export const contactsKeys = {
  all: ['contacts'] as const,
  list: () => [...contactsKeys.all, 'list'] as const,
  detail: (id: string) => [...contactsKeys.all, id] as const,
  kpis: () => [...contactsKeys.all, 'kpis'] as const,
  roles: () => [...contactsKeys.all, 'roles'] as const,
};
