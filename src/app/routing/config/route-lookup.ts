import type { BreadcrumbMeta, RouteDef } from './types';

/** Base path where the app is mounted (e.g. "/app" when Route is path="app/*"). */
export const ROUTER_BASE_PATH = '/app';

export interface RouteEntry {
  /** Path pattern relative to {@link ROUTER_BASE_PATH}, e.g. `/directory/vendors/*`. */
  fullPath: string;
  title?: string;
  breadcrumb?: BreadcrumbMeta;
}

/**
 * Flattens the route tree into the list every lookup here matches against.
 *
 * Children inherit the parent's path with any trailing `/*` stripped: React
 * Router treats `/*` as a layout catch-all, and child paths are relative to the
 * parent without it.
 */
function flattenRouteTree(nodes: RouteDef[], basePath = ''): RouteEntry[] {
  const entries: RouteEntry[] = [];

  for (const node of nodes) {
    const segment = node.path === '/' ? '' : node.path;
    const fullPath = basePath
      ? `${basePath}${segment ? `/${segment}` : ''}`
      : segment
        ? `/${segment}`
        : '/';

    if (node.title || node.breadcrumb) {
      entries.push({ fullPath, title: node.title, breadcrumb: node.breadcrumb });
    }
    if (node.children?.length) {
      const childBase = fullPath === '/' ? '' : fullPath.replace(/\/\*$/, '');
      entries.push(...flattenRouteTree(node.children, childBase));
    }
  }

  return entries;
}

/** Converts a route pattern to a regex that matches real pathnames. */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/:[^/]+/g, '[^/]+') // ":param" → one segment
    .replace(/\/\*$/, '(/.*)?'); // "hr/*" → /hr and /hr/anything
  return new RegExp(`^${escaped}$`);
}

/** Strips the mount point so a pathname can be matched against the tree. */
export function toRoutePath(pathname: string): string {
  const withoutBase = pathname.replace(new RegExp(`^${ROUTER_BASE_PATH}`), '') || '/';
  return withoutBase.replace(/\/$/, '') || '/';
}

/**
 * The most specific route entry matching a pathname.
 *
 * Longest pattern wins, so `/directory/vendors/*` beats `/directory` for a
 * vendor URL. Entries carrying only breadcrumb metadata are matched too, which
 * is what lets a route name a segment without owning a document title.
 */
export function findRouteEntry(
  pathname: string,
  tree: RouteDef[],
  predicate?: (entry: RouteEntry) => boolean
): RouteEntry | undefined {
  const normalizedPath = toRoutePath(pathname);
  let best: RouteEntry | undefined;
  let bestLength = -1;

  for (const entry of flattenRouteTree(tree)) {
    if (predicate && !predicate(entry)) continue;
    if (!patternToRegex(entry.fullPath).test(normalizedPath)) continue;
    if (entry.fullPath.length > bestLength) {
      bestLength = entry.fullPath.length;
      best = entry;
    }
  }

  return best;
}

/**
 * Document title for a pathname. Falls back through the tree, so a route with
 * no title of its own inherits its parent's.
 */
export function getTitleForPathname(pathname: string, tree: RouteDef[]): string | undefined {
  return findRouteEntry(pathname, tree, (entry) => Boolean(entry.title))?.title;
}

/**
 * The label a path segment should carry in the breadcrumb trail, taken from the
 * route that owns it rather than from a hard-coded map.
 *
 * Returns `null` for a segment the route asks to hide.
 */
export function getCrumbLabelForPath(
  pathname: string,
  tree: RouteDef[]
): { label: string; hidden: boolean } | undefined {
  const entry = findRouteEntry(pathname, tree);
  if (!entry) return undefined;

  const label = entry.breadcrumb?.label ?? entry.title;
  if (!label) return undefined;

  return { label, hidden: entry.breadcrumb?.hide === true };
}

/**
 * The list a record on this path belongs to: the nearest ancestor route that
 * owns a title.
 *
 * This is what a detail header's back link should point at. Hand-typed relative
 * targets had drifted — `../..` from `/app/directory/vendors/:id` resolves to
 * `/app/directory`, not the vendor list the link was labelled with.
 */
export function findParentResourceRoute(
  pathname: string,
  tree: RouteDef[]
): { to: string; label: string } | undefined {
  const segments = toRoutePath(pathname).split('/').filter(Boolean);

  for (let depth = segments.length - 1; depth > 0; depth -= 1) {
    const candidate = `/${segments.slice(0, depth).join('/')}`;
    const entry = findRouteEntry(`${ROUTER_BASE_PATH}${candidate}`, tree, (match) =>
      Boolean(match.title)
    );

    if (entry?.title) {
      return { to: `${ROUTER_BASE_PATH}${candidate}`, label: entry.title };
    }
  }

  return undefined;
}

/**
 * The singular record name a dynamic segment under this path stands for — shown
 * while the record's own name is still loading.
 */
export function getEntityLabelForPath(pathname: string, tree: RouteDef[]): string | undefined {
  return findRouteEntry(pathname, tree, (entry) => Boolean(entry.breadcrumb?.entityLabel))
    ?.breadcrumb?.entityLabel;
}
