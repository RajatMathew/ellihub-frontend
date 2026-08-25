import { useContext, useEffect } from 'react';

import {
  BreadcrumbTrailContext,
  type BreadcrumbTrailEntry,
} from '@/app/contexts/breadcrumbs';

/**
 * Appends crumbs to the header's path-derived breadcrumbs for as long as the
 * calling page is mounted.
 *
 * `trail` has to be referentially stable — memoize it — because a new object on
 * every render would re-register on every render.
 */
export function useBreadcrumbTrail(trail: BreadcrumbTrailEntry[] | null) {
  const context = useContext(BreadcrumbTrailContext);
  const setTrail = context?.setTrail;

  useEffect(() => {
    if (!setTrail) return;

    setTrail(trail);
    return () => setTrail(null);
  }, [setTrail, trail]);
}

export function useBreadcrumbTrailValue() {
  const context = useContext(BreadcrumbTrailContext);
  return context?.trail ?? null;
}
