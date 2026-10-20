import type { ReactNode } from 'react';

import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import { QueryErrorState } from '@/app/components/query-error-state';
import { useAccess } from '@/app/contexts/access-context';

interface PermissionRouteProps {
  resource: string;
  action: string;
  children: ReactNode;
}

export function PermissionRoute({ resource, action, children }: PermissionRouteProps) {
  const { can, isLoading, isError, refetch } = useAccess();

  if (isLoading) return <ModuleLoader />;
  // Not `Forbidden`: when the permission fetch itself failed we do not know
  // whether the user may be here, and telling them they may not is both wrong
  // and a dead end. Say what happened and offer the retry.
  if (isError) {
    return (
      <QueryErrorState
        title="Could not check your permissions"
        description="We could not load what you have access to. Check your connection and try again."
        onRetry={refetch}
      />
    );
  }
  if (!can(resource, action)) return <Forbidden />;

  return <>{children}</>;
}
