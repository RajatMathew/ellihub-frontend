import { Link, useLocation } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';

export function HeaderBreadcrumbs() {
  const location = useLocation();

  // Split path & remove empty + first "app"
  const pathSegments = location.pathname
    .split('/')
    .filter(Boolean)
    .filter((_, index) => index !== 0); // remove "app"

  // Build cumulative paths
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + ['app', ...pathSegments.slice(0, index + 1)].join('/');
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
