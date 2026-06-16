import type { ReactNode } from 'react';

import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import { useAccess } from '@/app/contexts/access-context';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAccess();

  if (isLoading) return <ModuleLoader />;
  if (!isAdmin) return <Forbidden />;

  return <>{children}</>;
}
