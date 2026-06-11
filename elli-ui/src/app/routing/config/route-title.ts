import type { RouteDef } from './types';

interface RouteEntry {
  fullPath: string;
  title?: string;
}

/**
 * Flattens the route tree into a list of { fullPath, title } for matching.
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

    if (node.title) {
      entries.push({ fullPath, title: node.title });
    }
    if (node.children?.length) {
      // Strip trailing /* from the base path for children — React Router treats /*
      // as a layout catchall; children paths are relative to the parent without it.
      const childBase = fullPath === '/' ? '' : fullPath.replace(/\/\*$/, '');
      entries.push(...flattenRouteTree(node.children, childBase));
    }
  }

  return entries;
}

/**
 * Converts a route path pattern (e.g. "/project/:projectId/overview") to a regex
 * that matches actual pathnames.
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/:[^/]+/g, '[^/]+') // ":param" → match any single segment
    .replace(/\/\*$/, '(/.*)?'); // "hr/*" → match /hr and /hr/anything (strip the leading slash with the wildcard)
  return new RegExp(`^${escaped}$`);
}

/** Base path where the app is mounted (e.g. "/app" when Route is path="app/*"). */
export const ROUTER_BASE_PATH = '/app';

/**
 * Returns the document title for the current pathname by matching against the route tree.
 * Uses the most specific (longest) matching route.
 * Strips ROUTER_BASE_PATH from pathname before matching.
 */
export function getTitleForPathname(pathname: string, tree: RouteDef[]): string | undefined {
  const entries = flattenRouteTree(tree);
  const pathWithoutBase = pathname.replace(new RegExp(`^${ROUTER_BASE_PATH}`), '') || '/';
  const normalizedPath = pathWithoutBase.replace(/\/$/, '') || '/';

  let best: RouteEntry | undefined;
  let bestLength = -1;

  for (const entry of entries) {
    if (!entry.title) continue;
    const regex = patternToRegex(entry.fullPath);
    if (regex.test(normalizedPath)) {
      const len = entry.fullPath.length;
      if (len > bestLength) {
        bestLength = len;
        best = entry;
      }
    }
  }

  return best?.title;
}
