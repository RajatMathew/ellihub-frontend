import { Fragment } from 'react';

import { Link, useLocation, useParams } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';
import { useBreadcrumbLabels } from '@/app/hooks/use-breadcrumb-label';
import { useProjectDetailQuery } from '@/modules/project/hooks';

const ROUTE_LABELS: Record<string, string> = {
  rfqs: 'RFQs',
  'sub-change-order': 'Sub Change Order',
};

export function HeaderBreadcrumbs() {
  const location = useLocation();
  const params = useParams<{ projectId?: string }>();
  const breadcrumbLabels = useBreadcrumbLabels();

  // Split path & remove empty + first "app"
  const pathSegments = location.pathname
    .split('/')
    .filter(Boolean)
    .filter((_, index) => index !== 0); // remove "app"
  const projectSegmentIndex = pathSegments.indexOf('project');
  const projectIdFromPath =
    projectSegmentIndex >= 0 ? pathSegments[projectSegmentIndex + 1] : undefined;
  const projectId = params.projectId ?? projectIdFromPath;

  const { data: project } = useProjectDetailQuery(projectId ?? '');

  // Build cumulative paths
  let breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + ['app', ...pathSegments.slice(0, index + 1)].join('/');
    const dynamicLabel = breadcrumbLabels[path];

    if (dynamicLabel) {
      return {
        label: dynamicLabel,
        path,
        isLast: index === pathSegments.length - 1,
      };
    }

    // Replace project ID with project name and link to overview
    if (projectId && segment === projectId) {
      return {
        label: project?.name ?? 'Loading...',
        path: path + '/overview',
        isLast: index === pathSegments.length - 1,
      };
    }

    return {
      label:
        ROUTE_LABELS[segment] ??
        decodeURIComponent(segment)
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

  const breadcrumbItemClassName =
    'cursor-pointer rounded-md px-2 py-1 font-medium transition-colors hover:bg-accent hover:text-foreground';

  return (
    <Breadcrumb className="lg:-translate-x-2">
      <BreadcrumbList className="gap-0.5 text-sm font-medium">
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={`${crumb.path}-${index}`}>
            {index > 0 && (
              <BreadcrumbSeparator className="mx-0 text-muted-foreground [&>svg]:stroke-[2.5]" />
            )}
            <BreadcrumbItem className="gap-0.5">
              {crumb.isLast || index === 0 ? (
                <BreadcrumbPage
                  className={`${breadcrumbItemClassName} ${
                    crumb.isLast ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  asChild
                  className={`${breadcrumbItemClassName} text-muted-foreground`}
                >
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
