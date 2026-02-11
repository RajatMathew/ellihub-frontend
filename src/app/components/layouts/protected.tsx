import { memo, useMemo } from 'react';

import { Navigate, Outlet } from 'react-router-dom';

import { useSession } from '@app/api';
import { useNextUrl } from '@app/hooks/use-next-url';

const ProtectedLayout = () => {
  const { isPending, data } = useSession();
  const { nextUrl } = useNextUrl();

  // Memoize encoded next url (prevents recalculation on re-render)
  const loginRedirectPath = useMemo(() => {
    return `/login?next=${encodeURIComponent(nextUrl)}`;
  }, [nextUrl]);

  // Loading state (kept extremely lightweight)
  if (isPending) return null;

  // If authenticated → render children
  if (data?.session) return <Outlet />;

  if (!isPending && !data?.session) return <Navigate to={loginRedirectPath} replace />;
};

export default memo(ProtectedLayout);
