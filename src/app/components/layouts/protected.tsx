import { memo, useMemo } from 'react';

import { Navigate, Outlet } from 'react-router-dom';

import { useSession } from '@app/api';
import { useNextUrl } from '@app/hooks/use-next-url';

import { ModuleLoader } from '../loader/elegant';

const ProtectedLayout = () => {
  const { isPending, data } = useSession();
  const { nextUrl, fullUrl } = useNextUrl();

  // Memoize encoded next url (prevents recalculation on re-render)
  const signInRedirectPath = useMemo(() => {
    if (!nextUrl || fullUrl === '/') return '/sign-in';
    return `/sign-in?next=${nextUrl}`;
  }, [nextUrl, fullUrl]);

  // Loading state (kept extremely lightweight)
  if (isPending) return <ModuleLoader />;

  // If authenticated → render children
  if (data?.session) return <Outlet />;

  if (!isPending && !data?.session) return <Navigate to={signInRedirectPath} replace />;

  return null;
};

export default memo(ProtectedLayout);
