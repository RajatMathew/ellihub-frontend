import type { ReactNode } from 'react';

import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useAccess } from '@/app/contexts/access-context';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading, isError, refetch } = useAccess();

  if (isLoading) return <ModuleLoader />;
  // See PermissionRoute: a failed fetch is not the same answer as "no".
  if (isError) {
    return (
      <QueryErrorState
        title="Could not check your permissions"
        description="We could not load what you have access to. Check your connection and try again."
        onRetry={refetch}
      />
    );
  }
  if (!isAdmin) return <Forbidden />;

  return <>{children}</>;
}
