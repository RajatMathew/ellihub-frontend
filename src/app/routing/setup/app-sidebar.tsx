import { memo } from 'react';

import { Outlet, Route, Routes } from 'react-router-dom';

import SidebarBuilder from '@app/components/sidebar/sidebar-builder';
import { mainSidebarMenu, projectSidebarMenu } from '@app/routing/config';

function SidebarRoutingSetupInner() {
  return (
    <Routes>
      <Route index path="/*" element={<SidebarBuilder menuConfig={mainSidebarMenu} />} />
      <Route path="project/:projectId/*" element={<Outlet />}>
        <Route path="*" element={<SidebarBuilder menuConfig={projectSidebarMenu} />} />
      </Route>
    </Routes>
  );
}

export const SidebarRoutingSetup = memo(SidebarRoutingSetupInner);
