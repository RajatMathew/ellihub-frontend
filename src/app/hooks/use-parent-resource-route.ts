import { useMemo } from 'react';

import { findParentResourceRoute, routeTree } from '@/app/routing/config';
import { useLocation } from 'react-router-dom';

/**
 * The list the record on screen belongs to, resolved from the route tree.
 *
 * A detail header uses this for its back link so the target and the label come
 * from one source. Hand-typing them had produced links whose label and
 * destination disagreed.
 */
export function useParentResourceRoute() {
  const { pathname } = useLocation();

  return useMemo(() => findParentResourceRoute(pathname, routeTree), [pathname]);
}
