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

/** Check if a path segment looks like a ULID / CUID (all-uppercase alphanumeric, 20+ chars) */
function isIdSegment(segment: string) {
  return /^[A-Z0-9]{20,}$/i.test(segment);
}

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
  const breadcrumbs = pathSegments.map((segment, index) => {
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

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb) => (
          <div key={crumb.path} className="flex items-center">
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>

            {!crumb.isLast && (
              <BreadcrumbSeparator className="text-xs text-muted-foreground">/</BreadcrumbSeparator>
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
