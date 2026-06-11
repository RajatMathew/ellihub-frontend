import { memo, Suspense, type ReactNode } from 'react';

import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { AdminRoute } from '@app/components/access/admin-route';
import { Forbidden } from '@app/components/error/forbidden';
import { NotFound } from '@app/components/error/not-found';
import { ModuleLoader } from '@app/components/loader/elegant';
import { useAccess } from '@app/contexts/access-context';
import { DebugViteConfig } from '@app/lib/debug';
import { routeTree } from '@app/routing/config/routes';
import type { RouteDef } from '@app/routing/config/types';

const isDev = import.meta.env.DEV;

function AccessRoute({ access, children }: { access?: RouteDef['access']; children: ReactNode }) {
  const accessContext = useAccess();
  if (!access) return <>{children}</>;
  if (access === 'admin') return <AdminRoute>{children}</AdminRoute>;
  if (access === 'dev') {
    if (accessContext.isLoading) return <ModuleLoader />;
    return accessContext.isDev ? <>{children}</> : <Forbidden />;
  }
  if (typeof access === 'object') {
    if (accessContext.isLoading) return <ModuleLoader />;
    return accessContext.can(access.resource, access.action) ? <>{children}</> : <Forbidden />;
  }

  return <>{children}</>;
}

function routeTreeToRoutes(nodes: RouteDef[]): React.ReactNode {
  return nodes.map((def, i) => {
    // Only consider children that have a component as renderable routes.
    // Title-only children (no component) are used purely for document title resolution.
    const renderableChildren = def.children?.filter((c) => c.component);
    const hasChildren = renderableChildren && renderableChildren.length > 0;
    const key = `${def.path}-${def.title ?? i}`;
    const Element = def.component;
    const routeContent = Element ? <Element /> : hasChildren ? <Outlet /> : null;
    const element = routeContent ? (
      <AccessRoute access={def.access}>{routeContent}</AccessRoute>
    ) : null;
    if (hasChildren) {
      return (
        <Route key={key} path={def.path} element={element}>
          {routeTreeToRoutes(renderableChildren)}
        </Route>
      );
    }
    return <Route key={key} path={def.path} element={element} />;
  });
}

function getTopLevelRoutes(tree: RouteDef[]): RouteDef[] {
  if (tree.length === 1 && tree[0].path === '/' && tree[0].children?.length) {
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
    <Suspense fallback={<ModuleLoader />} key={location.pathname}>
      <Routes>
        <Route index element={<Navigate to="projects" replace />} />
        {mainRouteElements}
        <Route path="*" element={isDev ? <DebugViteConfig /> : <NotFound />} />
      </Routes>
    </Suspense>
  );
}

export const AppRoutingSetup = memo(AppRoutingSetupInner);
