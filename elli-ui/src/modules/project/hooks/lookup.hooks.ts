import { useQuery } from '@tanstack/react-query';

import { lookupApi } from '@/modules/project/api/lookup.api';

export const lookupKeys = {
  all: ['lookup'] as const,
  lists: () => [...lookupKeys.all, 'list'] as const,
  list: (type: string) => [...lookupKeys.lists(), type] as const,
};

export const useLookupsQuery = (type?: string) =>
  useQuery({
    queryKey: type ? lookupKeys.list(type) : lookupKeys.lists(),
    queryFn: () => (type ? lookupApi.listByType(type) : lookupApi.listAll()),
  });

export const useDivisionsQuery = () =>
  useQuery({
    queryKey: lookupKeys.list('GC_TYPE'),
    queryFn: () => lookupApi.listByType('GC_TYPE'),
  });
