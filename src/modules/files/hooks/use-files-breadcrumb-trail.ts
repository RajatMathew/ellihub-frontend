import { useMemo } from 'react';

import { useBreadcrumbTrail } from '@/app/hooks/use-breadcrumb-trail';
import type { FilesBreadcrumbEntry } from '@/modules/files/components/files-breadcrumbs';
import { folderHref } from '@/modules/files/lib/folder-navigation';
import { useLocation } from 'react-router-dom';

/**
 * Publishes the open folder's path to the header breadcrumbs.
 *
 * The folder is `?folderId=`, not part of the path, so the header cannot work
 * it out for itself — see `useBreadcrumbTrail`.
 */
export function useFilesBreadcrumbTrail(breadcrumbs: FilesBreadcrumbEntry[]) {
  const { pathname, search } = useLocation();

  // View mode, sort and the date range are kept; the search is not - see
  // `folderHref`, which the explorer's Back link uses too.
  const entries = useMemo(
    () =>
      breadcrumbs.map((entry) => ({
        id: entry.id,
        label: entry.name,
        to: folderHref({ pathname, search }, entry.id),
      })),
    [breadcrumbs, pathname, search]
  );

  useBreadcrumbTrail(entries);
}
