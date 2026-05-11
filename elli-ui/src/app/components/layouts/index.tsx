import { useEffect, useMemo } from 'react';

import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

import { LayoutProvider } from '@app/providers/layout';
import { getTitleForPathname, routeTree } from '@app/routing/config';

const DEFAULT_TITLE = 'Elle Hub';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  const title = useMemo(
    () => getTitleForPathname(pathname, routeTree) ?? DEFAULT_TITLE,
    [pathname]
  );

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <LayoutProvider
        bodyClassName="bg-background lg:[&_.container-fluid]:px-7.5 lg:overflow-hidden"
        style={
          {
            '--page-margin': '0px',
            '--sidebar-width': '240px',
            '--sidebar-collapsed-width': '0px',
            '--sidebar-header-height': '54px',
            '--header-height': '60px',
            '--header-height-mobile': '60px',
          } as React.CSSProperties
        }
      >
        {children}
      </LayoutProvider>
    </>
  );
}
