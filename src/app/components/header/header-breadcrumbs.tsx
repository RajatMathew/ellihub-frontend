import { Fragment } from 'react';

import { Link, useLocation, useParams } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { useProjectDetailQuery } from '@modules/project/hooks';

export function HeaderBreadcrumbs() {
  const location = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();

  const { data: project } = useProjectDetailQuery(projectId ?? '');

  // Split path & remove empty + first "app"
  const pathSegments = location.pathname
    .split('/')
    .filter(Boolean)
    .filter((_, index) => index !== 0); // remove "app"

  // Build cumulative paths
  let breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + ['app', ...pathSegments.slice(0, index + 1)].join('/');

    // Replace project ID with project name and link to overview
    if (projectId && segment === projectId) {
      return {
        label: project?.name ?? 'Loading...',
        path: path + '/overview',
        isLast: index === pathSegments.length - 1,
      };
    }

    return {
      label: decodeURIComponent(segment)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      path,
      isLast: index === pathSegments.length - 1,
    };
  });

  // Filter out redundant overview if it's the last segment and follows the project name
  if (breadcrumbs.length > 1) {
    const last = breadcrumbs[breadcrumbs.length - 1];
    const prev = breadcrumbs[breadcrumbs.length - 2];
    if (last.label === 'Overview' && last.path === prev.path) {
      breadcrumbs = breadcrumbs.slice(0, -1);
      breadcrumbs[breadcrumbs.length - 1].isLast = true;
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={`${crumb.path}-${index}`}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast || index == 0 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
