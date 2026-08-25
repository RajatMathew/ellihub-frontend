import { useMemo } from 'react';

import { useBreadcrumbTrail } from '@/app/hooks/use-breadcrumb-trail';
import type { FilesBreadcrumbEntry } from '@/modules/files/components/files-breadcrumbs';
import { useLocation } from 'react-router-dom';

/**
 * Publishes the open folder's path to the header breadcrumbs.
 *
 * The folder is `?folderId=`, not part of the path, so the header cannot work
 * it out for itself — see `useBreadcrumbTrail`.
 */
export function useFilesBreadcrumbTrail(breadcrumbs: FilesBreadcrumbEntry[]) {
  const location = useLocation();

  // Every other param is deliberately kept: view mode, sort and the date range
  // are how the user is looking at files, not where they are.
  const entries = useMemo(
    () =>
      breadcrumbs.map((entry) => {
        const params = new URLSearchParams(location.search);

        params.set('folderId', entry.id);
        params.delete('folderPath');
        params.delete('page');

        return {
          id: entry.id,
          label: entry.name,
          to: `${location.pathname}?${params.toString()}`,
        };
      }),
    [breadcrumbs, location.pathname, location.search]
  );

  useBreadcrumbTrail(entries);
}
