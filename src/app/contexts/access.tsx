import { useCallback, useMemo, type ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getCurrentAccess } from '@app/api/access';
import { AccessContext, type AccessContextValue } from '@app/contexts/access-context';

export function AccessProvider({ children }: { children: ReactNode }) {
  const accessQuery = useQuery({
    queryKey: ['current-access'],
    queryFn: getCurrentAccess,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const can = useCallback(
    (resource: string, action: string) => {
      return accessQuery.data?.permissions[resource]?.includes(action) ?? false;
    },
    [accessQuery.data]
  );

  const value = useMemo<AccessContextValue>(
    () => ({
      access: accessQuery.data,
      isLoading: accessQuery.isLoading,
      isDev: accessQuery.data?.isDev ?? accessQuery.data?.role === 'dev',
      isAdmin: accessQuery.data?.isAdmin ?? ['dev', 'admin'].includes(accessQuery.data?.role ?? ''),
      can,
    }),
    [accessQuery.data, accessQuery.isLoading, can]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}
