import { memo } from 'react';

import { Outlet, Route, Routes } from 'react-router-dom';

import { Header } from '@app/components/header/header';
import { mainHeaderConfig, projectHeaderConfig } from '@app/routing/config';

function HeaderRoutingSetupInner() {
  return (
    <Routes>
      <Route path="project/:projectId/*" element={<Outlet />}>
        <Route path="*" element={<Header {...projectHeaderConfig} />} />
      </Route>
      <Route index path="/*" element={<Header {...mainHeaderConfig} />} />
    </Routes>
  );
}

export const HeaderRoutingSetup = memo(HeaderRoutingSetupInner);
