import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useBreadcrumbLabels } from '@/app/hooks/use-breadcrumb-label';
import { cn } from '@/app/lib/utils';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import { CalendarDays, CheckSquare, ChevronDown, Eye, Mail, SunMedium } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

const ROUTE_LABELS: Record<string, string> = {
  hr: 'HR',
  rfqs: 'RFQs',
  'sub-change-order': 'Sub Change Order',
};

const DYNAMIC_SEGMENT_PARENTS = new Set([
  'contacts',
  'departments',
  'employees',
  'general-contractors',
  'invoices',
  'pto',
  'purchase-orders',
  'rfqs',
  'sub-change-order',
  'vendors',
]);

const DYNAMIC_SEGMENT_PENDING_LABELS: Record<string, string> = {
  contacts: 'Contact',
  departments: 'Department',
  employees: 'Employee',
  'general-contractors': 'General Contractor',
  invoices: 'Invoice',
  pto: 'PTO Request',
  'purchase-orders': 'Purchase Order',
  rfqs: 'RFQ',
  'sub-change-order': 'Sub Change Order',
  vendors: 'Vendor',
};

const STATIC_DETAIL_ACTION_SEGMENTS = new Set(['create', 'edit', 'new']);

const WORKSPACE_ITEMS = [
  { label: 'My Day', icon: SunMedium },
  { label: 'Mail', icon: Mail },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Tasks', icon: CheckSquare },
  { label: 'Peak', icon: Eye },
] as const;

function EmailWorkspaceSwitcher() {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors duration-100 hover:bg-surface-hover hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Switch workspace. Current workspace: Mail"
        >
          <Mail aria-hidden="true" className="size-4 text-current" />
          <span>Mail</span>
          <ChevronDown aria-hidden="true" className="size-3.5 text-current/80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Workspace
        </DropdownMenuLabel>
        {WORKSPACE_ITEMS.map(({ label, icon: Icon }) => {
          const isMail = label === 'Mail';

          return (
            <DropdownMenuItem
              key={label}
              disabled={!isMail}
              className={cn('min-h-10 gap-2 px-2', isMail && 'font-semibold')}
              onSelect={isMail ? () => navigate('/app/email') : undefined}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="font-medium">{label}</span>
              {isMail ? (
                <span className="ml-auto text-xs text-muted-foreground"></span>
              ) : (
                <span className="ml-auto text-xs text-muted-foreground"></span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
    const previousSegment = pathSegments[index - 1];

    if (dynamicLabel) {
      const pendingLabel =
        previousSegment && DYNAMIC_SEGMENT_PENDING_LABELS[previousSegment] === dynamicLabel;

      return {
        label: pendingLabel ? '' : dynamicLabel,
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

    const fallbackLabel =
      previousSegment &&
      !STATIC_DETAIL_ACTION_SEGMENTS.has(segment) &&
      DYNAMIC_SEGMENT_PARENTS.has(previousSegment)
        ? ''
        : undefined;

    if (fallbackLabel !== undefined) {
      return {
        label: fallbackLabel,
        path,
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

  const breadcrumbItemClassName = 'block min-w-0 truncate rounded-md px-2 py-1 font-medium';
  const breadcrumbLinkClassName = cn(
    breadcrumbItemClassName,
    'transition-colors hover:cursor-pointer hover:bg-surface-hover hover:text-foreground'
  );

  return (
    <Breadcrumb className="min-w-0 max-w-full overflow-hidden">
      <BreadcrumbList className="min-w-0 flex-nowrap gap-0.5 overflow-hidden text-sm font-medium">
        {breadcrumbs.map((crumb, index) => {
          const isEmailWorkspaceRoot = pathSegments[0] === 'email' && index === 0;
          const itemWidthClassName = crumb.isLast
            ? 'max-w-[min(28rem,42vw)]'
            : 'max-w-[min(16rem,24vw)]';

          return (
            <Fragment key={`${crumb.path}-${index}`}>
              {index > 0 && (
                <BreadcrumbSeparator className="mx-0 shrink-0 text-muted-foreground [&>svg]:stroke-[2.5]" />
              )}
              <BreadcrumbItem className="min-w-0 gap-0.5">
                {isEmailWorkspaceRoot ? (
                  <EmailWorkspaceSwitcher />
                ) : crumb.isLast ? (
                  <BreadcrumbPage
                    className={cn(
                      crumb.label ? breadcrumbItemClassName : 'block min-w-0 truncate py-1',
                      itemWidthClassName,
                      crumb.isLast ? 'text-foreground' : 'text-muted-foreground'
                    )}
                    title={crumb.label}
                  >
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    asChild
                    className={cn(
                      breadcrumbLinkClassName,
                      itemWidthClassName,
                      'text-muted-foreground'
                    )}
                  >
                    <Link to={crumb.path} title={crumb.label}>
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
