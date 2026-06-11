import { memo } from 'react';

import { useLocation } from 'react-router-dom';

import { Header } from '@app/components/header/header';
import { mainHeaderConfig, projectsDetailHeaderConfig } from '@app/routing/config';

function HeaderRoutingSetupInner() {
  const { pathname } = useLocation();
  const isProjectSidebar = /\/project\/[^/]+/.test(pathname);
  const config = isProjectSidebar ? projectsDetailHeaderConfig : mainHeaderConfig;

  return <Header {...config} sidebarMode={isProjectSidebar ? 'project' : 'main'} />;
}

export const HeaderRoutingSetup = memo(HeaderRoutingSetupInner);
