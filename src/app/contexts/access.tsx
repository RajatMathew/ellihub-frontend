import { useCallback, useMemo, type ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getCurrentAccess } from '@app/api/access';
import { AccessContext, type AccessContextValue } from '@app/contexts/access-context';
import { shouldRetryQuery } from '@app/lib/query-retry';

export function AccessProvider({ children }: { children: ReactNode }) {
  const accessQuery = useQuery({
    queryKey: ['current-access'],
    queryFn: getCurrentAccess,
    staleTime: 5 * 60 * 1000,
    // `retry: false` meant a single dropped request left the whole app looking
    // like an account with no permissions. The shared predicate retries what
    // can actually clear — a network blip, a 5xx — and still answers a 401 or
    // 403 immediately.
    retry: shouldRetryQuery,
  });

  const can = useCallback(
    (resource: string, action: string) => {
      return accessQuery.data?.permissions[resource]?.includes(action) ?? false;
    },
    [accessQuery.data]
  );

  // Depends on the query's own `refetch`, which TanStack Query keeps stable —
  // depending on `accessQuery` would rebuild the context value every render.
  const queryRefetch = accessQuery.refetch;
  const refetch = useCallback(() => {
    void queryRefetch();
  }, [queryRefetch]);

  const value = useMemo<AccessContextValue>(
    () => ({
      access: accessQuery.data,
      isLoading: accessQuery.isLoading,
      isError: accessQuery.isError,
      refetch,
      isDev: accessQuery.data?.isDev ?? accessQuery.data?.role === 'dev',
      isAdmin: accessQuery.data?.isAdmin ?? ['dev', 'admin'].includes(accessQuery.data?.role ?? ''),
      canAccessCheckingRegister: accessQuery.data?.canAccessCheckingRegister ?? false,
      can,
    }),
    [accessQuery.data, accessQuery.isLoading, accessQuery.isError, can, refetch]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}
