import { appLookupApi } from '@/app/api/lookup.api';
import { useQuery } from '@tanstack/react-query';

export const appLookupKeys = {
  all: ['lookup'] as const,
  list: (type: string) => [...appLookupKeys.all, type] as const,
};

export function useAppLookupsQuery(type: string) {
  return useQuery({
    queryKey: appLookupKeys.list(type),
    queryFn: () => appLookupApi.listByType(type),
    enabled: Boolean(type),
  });
}
