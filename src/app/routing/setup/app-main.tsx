import { memo } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Suspense } from "react";
import type { RouteDef } from "@app/routing/config/types";
import { routeTree } from "@app/routing/config/routes";
import { NotFound } from "@app/components/error/not-found";
import { DebugViteConfig } from "@app/lib/debug";
import { ScreenLoader } from "@app/components/screen-loader";

const isDev = import.meta.env.DEV;

function routeTreeToRoutes(nodes: RouteDef[]): React.ReactNode {
  return nodes.map((def, i) => {
    const hasChildren = def.children && def.children.length > 0;
    const key = `${def.path}-${def.title ?? i}`;
    const Element = def.component;
    if (hasChildren) {
      return (
        <Route
          key={key}
          path={def.path}
          element={Element ? <Element /> : <Outlet />}
        >
          {routeTreeToRoutes(def.children!)}
        </Route>
      );
    }
    return (
      <Route
        key={key}
        path={def.path}
        element={Element ? <Element /> : null}
      />
    );
  });
}

function getTopLevelRoutes(tree: RouteDef[]): RouteDef[] {
  if (tree.length === 1 && tree[0].path === "/" && tree[0].children?.length) {
    return tree[0].children;
  }
  return tree;
}

/** Pre-computed once at module load to avoid recalculating on every render. */
const topLevelRoutes = getTopLevelRoutes(routeTree);
const mainRouteElements = routeTreeToRoutes(topLevelRoutes);

function AppRoutingSetupInner() {
  const location = useLocation();
  return (
    <Suspense fallback={<ScreenLoader />} key={location.pathname}>
      <Routes>
        <Route index element={<Navigate to="projects" replace />} />
        {mainRouteElements}
        <Route path="*" element={isDev ? <DebugViteConfig /> : <NotFound />} />
      </Routes>
    </Suspense>
  );
}

export const AppRoutingSetup = memo(AppRoutingSetupInner);
