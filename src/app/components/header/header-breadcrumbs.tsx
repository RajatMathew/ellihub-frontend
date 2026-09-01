import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';
import { BreadcrumbMenu } from '@/app/components/ui/breadcrumb-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useBreadcrumbLabels } from '@/app/hooks/use-breadcrumb-label';
import { useBreadcrumbTrailValue } from '@/app/hooks/use-breadcrumb-trail';
import { cn } from '@/app/lib/utils';
import { getCrumbLabelForPath, getEntityLabelForPath, routeTree } from '@/app/routing/config';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import { CalendarDays, CheckSquare, ChevronDown, Eye, Mail, SunMedium } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

/**
 * Id of the empty slot rendered after the last breadcrumb. Pages portal
 * contextual actions into it (see EmailWorkspaceHeader) so the actions read as
 * part of the trail without the header knowing about any specific page.
 */
export const BREADCRUMB_PAGE_ACTIONS_ID = 'breadcrumb-page-actions';

const STATIC_DETAIL_ACTION_SEGMENTS = new Set(['create', 'edit', 'new']);

/** Title Case fallback for a segment no route claims. */
function humanizeSegment(segment: string) {
  return decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * How many appended crumbs stay on the bar before the rest fold into the
 * ellipsis menu. Path-derived crumbs are never folded: a route has at most a
 * handful and each one names a section the user needs to see.
 */
const MAX_VISIBLE_TRAIL_ENTRIES = 2;

/** A crumb as it is rendered, whether it came from the path or from a page. */
interface RenderedCrumb {
  key: string;
  label: string;
  to?: string;
}

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
  const trail = useBreadcrumbTrailValue();

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

  // Build cumulative paths. Labels come from the route that owns each segment,
  // so naming a section is done once in the route tree rather than in a map
  // here that has to be kept in step with it.
  let breadcrumbs = pathSegments
    .map((segment, index) => {
      const path = '/' + ['app', ...pathSegments.slice(0, index + 1)].join('/');
      const parentPath =
        index > 0 ? '/' + ['app', ...pathSegments.slice(0, index)].join('/') : undefined;
      const isLast = index === pathSegments.length - 1;
      const dynamicLabel = breadcrumbLabels[path];

      // A segment is a record id when the route above it declares what kind of
      // record it lists — `create` and `edit` are that route's own actions.
      const entityLabel = parentPath ? getEntityLabelForPath(parentPath, routeTree) : undefined;
      const isRecordSegment =
        entityLabel !== undefined && !STATIC_DETAIL_ACTION_SEGMENTS.has(segment);

      // Project detail URLs use the singular `/project/:projectId` route, while
      // the Projects breadcrumb should return to the plural project index.
      if (segment === 'project' && index === projectSegmentIndex) {
        return { label: 'Project', path: '/app/projects', isLast, hidden: false };
      }

      if (dynamicLabel) {
        // The page has not resolved a real name yet and is echoing the route's
        // placeholder; render nothing rather than the word "Vendor".
        const isPlaceholder = isRecordSegment && dynamicLabel === entityLabel;
        return { label: isPlaceholder ? '' : dynamicLabel, path, isLast, hidden: false };
      }

      // Replace project ID with project name and link to overview
      if (projectId && segment === projectId) {
        return {
          label: project?.name ?? 'Loading...',
          path: path + '/overview',
          isLast,
          hidden: false,
        };
      }

      if (isRecordSegment) {
        return { label: '', path, isLast, hidden: false };
      }

      const crumb = getCrumbLabelForPath(path, routeTree);

      return {
        label: crumb?.label ?? humanizeSegment(segment),
        path,
        isLast,
        hidden: crumb?.hidden === true,
      };
    })
    .filter((crumb) => !crumb.hidden);

  // Filter out redundant overview if it's the last segment and follows the project name
  if (breadcrumbs.length > 1) {
    const last = breadcrumbs[breadcrumbs.length - 1];
    const prev = breadcrumbs[breadcrumbs.length - 2];
    if (last.label === 'Overview' && last.path === prev.path) {
      breadcrumbs = breadcrumbs.slice(0, -1);
      breadcrumbs[breadcrumbs.length - 1].isLast = true;
    }
  }

  // Mail deep links end in `/id/:conversationId` — an addressing detail, not a
  // navigational level. Drop that pair so the trail ends at the folder crumb.
  if (pathSegments[0] === 'email' && pathSegments[1] === 'accounts') {
    const idIndex = pathSegments.indexOf('id', 3);
    if (idIndex !== -1) {
      breadcrumbs = breadcrumbs.slice(0, idIndex);
      const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
      if (lastCrumb) lastCrumb.isLast = true;
    }
  }

  // Crumbs a page registered for state the path cannot express — the open
  // folder in Files, for one. The last path crumb stops being the final one
  // once they exist, and it is what the trail's own menu hangs off.
  const pathCrumbs: RenderedCrumb[] = breadcrumbs.map((crumb, index) => ({
    key: `${crumb.path}-${index}`,
    label: crumb.label,
    to: crumb.path,
  }));
  const trailEntries = trail ?? [];
  const shouldCollapseTrail = trailEntries.length > MAX_VISIBLE_TRAIL_ENTRIES;
  const hiddenTrailEntries = shouldCollapseTrail
    ? trailEntries.slice(0, trailEntries.length - MAX_VISIBLE_TRAIL_ENTRIES)
    : [];
  const visibleTrailCrumbs: RenderedCrumb[] = (
    shouldCollapseTrail ? trailEntries.slice(-MAX_VISIBLE_TRAIL_ENTRIES) : trailEntries
  ).map((entry) => ({
    key: `trail-${entry.id}`,
    label: entry.label,
    to: entry.to,
  }));
  const crumbs = [...pathCrumbs, ...visibleTrailCrumbs];
  // Where the ellipsis goes, once the leading path crumbs have been rendered.
  const ellipsisIndex = hiddenTrailEntries.length > 0 ? pathCrumbs.length : -1;

  const breadcrumbItemClassName = 'block min-w-0 truncate rounded-md px-2 py-1 font-medium';
  const breadcrumbLinkClassName = cn(
    breadcrumbItemClassName,
    'transition-colors hover:cursor-pointer hover:bg-surface-hover hover:text-foreground'
  );

  return (
    <Breadcrumb className="min-w-0 max-w-full overflow-hidden">
      <BreadcrumbList className="min-w-0 flex-nowrap gap-0.5 overflow-hidden text-sm font-medium">
        {crumbs.map((crumb, index) => {
          const isEmailWorkspaceRoot = pathSegments[0] === 'email' && index === 0;
          const isLast = index === crumbs.length - 1;
          const itemWidthClassName = isLast ? 'max-w-[min(28rem,42vw)]' : 'max-w-[min(16rem,24vw)]';

          return (
            <Fragment key={crumb.key}>
              {index === ellipsisIndex && (
                <>
                  <BreadcrumbSeparator className="mx-0 shrink-0 text-muted-foreground [&>svg]:stroke-[2.5]" />
                  <BreadcrumbItem className="shrink-0">
                    <BreadcrumbMenu label="Show hidden folders">
                      {hiddenTrailEntries.map((entry) => (
                        <DropdownMenuItem key={entry.id} asChild>
                          <Link to={entry.to ?? '#'} className="min-h-9 truncate">
                            {entry.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </BreadcrumbMenu>
                  </BreadcrumbItem>
                </>
              )}
              {index > 0 && (
                <BreadcrumbSeparator className="mx-0 shrink-0 text-muted-foreground [&>svg]:stroke-[2.5]" />
              )}
              <BreadcrumbItem className="min-w-0 gap-0.5">
                {isEmailWorkspaceRoot ? (
                  <EmailWorkspaceSwitcher />
                ) : isLast || !crumb.to ? (
                  <BreadcrumbPage
                    className={cn(
                      crumb.label ? breadcrumbItemClassName : 'block min-w-0 truncate py-1',
                      itemWidthClassName,
                      isLast ? 'text-foreground' : 'text-muted-foreground'
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
                    <Link to={crumb.to} title={crumb.label}>
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
        {/* Portal target: pages can dock contextual actions (e.g. the mailbox
            settings menu) right after their final crumb. */}
        <li
          id={BREADCRUMB_PAGE_ACTIONS_ID}
          className="flex shrink-0 items-center"
          aria-hidden={undefined}
        />
      </BreadcrumbList>
    </Breadcrumb>
  );
}
