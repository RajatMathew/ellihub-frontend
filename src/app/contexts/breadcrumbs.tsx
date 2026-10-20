import { createContext } from 'react';

export interface BreadcrumbLabelsContextValue {
  labels: Record<string, string>;
  setLabel: (path: string, label?: string) => void;
}

export const BreadcrumbLabelsContext = createContext<BreadcrumbLabelsContextValue | undefined>(
  undefined
);

/**
 * One crumb a page appends to the path-derived trail.
 *
 * The header builds its breadcrumbs from `location.pathname`, which is enough
 * for every route whose position is in its URL. Files navigates by `?folderId=`
 * — the path is the same for every folder — so it hands the header the crumbs
 * the path cannot describe instead of keeping its own bar in the page body.
 */
export interface BreadcrumbTrailEntry {
  id: string;
  label: string;
  /** Where clicking the crumb goes. A crumb without one is not a link. */
  to?: string;
}

export interface BreadcrumbTrailContextValue {
  trail: BreadcrumbTrailEntry[] | null;
  setTrail: (trail: BreadcrumbTrailEntry[] | null) => void;
}

export const BreadcrumbTrailContext = createContext<BreadcrumbTrailContextValue | undefined>(
  undefined
);
