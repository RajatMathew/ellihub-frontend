import { memo } from "react";
import SidebarBuilder from "@app/components/sidebar/sidebar-builder";
import { mainSidebarMenu, projectSidebarMenu } from "@app/routing/config";
import { Outlet, Route, Routes } from "react-router-dom";

function SidebarRoutingSetupInner() {
  return (
    <Routes>
      <Route path="project/:projectId/*" element={<Outlet />}>
        <Route
          path="*"
          element={<SidebarBuilder menuConfig={projectSidebarMenu} />}
        />
      </Route>
      <Route
        index
        path="/*"
        element={<SidebarBuilder menuConfig={mainSidebarMenu} />}
      />
    </Routes>
  );
}

export const SidebarRoutingSetup = memo(SidebarRoutingSetupInner);
