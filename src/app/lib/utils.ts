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
 * For project routes (/app/project/:id/...), sidebar links like "../vendors/purchase-orders"
 * are meant relative to the project root, not the current pathname (otherwise we'd resolve
 * to .../vendors/vendors/purchase-orders). Returns the base pathname for resolving menu
 * paths and whether to strip a leading "../" (use project root as base).
 */
export function getSidebarResolutionBase(pathname: string): {
  base: string;
  stripLeadingDotDotSlash: boolean;
} {
  const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);
  const projectIndex = segments.indexOf('project');
  const isProjectRoute = projectIndex !== -1 && segments[projectIndex + 1] && segments[0] === 'app';
  if (isProjectRoute) {
    const projectRoot = '/' + segments.slice(0, projectIndex + 2).join('/');
    return { base: projectRoot, stripLeadingDotDotSlash: true };
  }
  return { base: pathname, stripLeadingDotDotSlash: false };
}
