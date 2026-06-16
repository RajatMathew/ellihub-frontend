import type { ReactNode } from 'react';

import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import { useAccess } from '@/app/contexts/access-context';

interface PermissionRouteProps {
  resource: string;
  action: string;
  children: ReactNode;
}

export function PermissionRoute({ resource, action, children }: PermissionRouteProps) {
  const { can, isLoading } = useAccess();

  if (isLoading) return <ModuleLoader />;
  if (!can(resource, action)) return <Forbidden />;

  return <>{children}</>;
}
