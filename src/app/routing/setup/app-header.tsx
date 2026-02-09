import { memo } from 'react';

import { Outlet, Route, Routes } from 'react-router-dom';

import { Header } from '@app/components/header/header';
import SidebarBuilder from '@app/components/sidebar/sidebar-builder';
import {
  mainHeaderConfig,
  mainSidebarMenu,
  projectHeaderConfig,
  projectSidebarMenu,
} from '@app/routing/config';

function HeaderRoutingSetupInner() {
  return (
    <Routes>
      <Route path="project/:projectId/*" element={<Outlet />}>
        <Route
          path="*"
          element={
            <Header
              {...projectHeaderConfig}
              sidebar={<SidebarBuilder menuConfig={projectSidebarMenu} />}
            />
          }
        />
      </Route>
      <Route
        index
        path="/*"
        element={
          <Header {...mainHeaderConfig} sidebar={<SidebarBuilder menuConfig={mainSidebarMenu} />} />
        }
      />
    </Routes>
  );
}

export const HeaderRoutingSetup = memo(HeaderRoutingSetupInner);
