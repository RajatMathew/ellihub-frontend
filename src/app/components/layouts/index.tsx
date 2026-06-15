import { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { LayoutProvider } from '@app/providers/layout';
import { getTitleForPathname, routeTree } from '@app/routing/config';

const DEFAULT_TITLE = 'ElliHub';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    const title = getTitleForPathname(location.pathname, routeTree) ?? DEFAULT_TITLE;
    document.title = title;
  }, [location.pathname]);

  return (
    <LayoutProvider
      bodyClassName="bg-main-background lg:[&_.container-fluid]:px-7.5 lg:overflow-hidden"
      style={
        {
          '--page-margin': '0px',
          '--sidebar-width': '240px',
          '--sidebar-collapsed-width': '0px',
          '--sidebar-header-height': '54px',
          '--header-height': '48px',
          '--header-height-mobile': '48px',
        } as React.CSSProperties
      }
    >
      {children}
    </LayoutProvider>
  );
}
