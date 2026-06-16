import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving any conflicts.
 *
 * @param inputs - An array of class names to merge.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a relative path against a base pathname (same as React Router / browser resolution).
 * Used so sidebar menu paths (e.g. "../projects") can be compared to useLocation().pathname.
 */
export function resolvePath(basePathname: string, path: string): string {
  if (path.startsWith('/')) return path.replace(/\/$/, '') || '/';
  const baseSegments = basePathname.replace(/\/$/, '').split('/').filter(Boolean);
  const relSegments = path.split('/').filter(Boolean);
  for (const seg of relSegments) {
    if (seg === '..') baseSegments.pop();
    else if (seg !== '.') baseSegments.push(seg);
  }
  return '/' + baseSegments.join('/');
}

/**
 * Sidebar menu paths like "../directory/contacts" or "../vendors/purchase-orders" are
 * relative to the layout root (/app or /app/project/:id), not the current pathname.
 * Resolving from the full pathname would produce wrong paths (e.g. .../directory/directory/contacts).
 * Returns the base pathname for resolving and whether to strip a leading "../".
 */
export function getSidebarResolutionBase(pathname: string): {
  base: string;
  stripLeadingDotDotSlash: boolean;
} {
  const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);
  if (segments[0] !== 'app') {
    return { base: pathname, stripLeadingDotDotSlash: false };
  }
  // Project detail pages live under /app/project/:id/*. Keep /app/projects/new
  // on the main app base so sidebar links do not resolve under the create route.
  const projectIndex = segments.indexOf('project');
  const isProjectRoute = projectIndex !== -1 && segments[projectIndex + 1];
  if (isProjectRoute) {
    const projectRoot = '/' + segments.slice(0, projectIndex + 2).join('/');
    return { base: projectRoot, stripLeadingDotDotSlash: true };
  }
  // Main app: /app, /app/directory/contacts, etc. — resolve "../..." relative to /app
  const appRoot = '/app';
  return { base: appRoot, stripLeadingDotDotSlash: true };
}
