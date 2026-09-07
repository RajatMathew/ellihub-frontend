/* eslint-disable react-refresh/only-export-components -- route config exports routeTree and route helper components */

import { lazy } from 'react';

import { NotFound } from '@/app/components/error/not-found';
import { ModuleLoader } from '@/app/components/loader/elegant';
import DelayForDemo from '@/app/lib/delay';
import { NavigateTo } from '@/app/lib/navigateTo';
import { useInfiniteProjectOptionsQuery } from '@/modules/project/hooks';
import { Navigate, Outlet } from 'react-router-dom';

import type { RouteDef } from './types';

const isDev = import.meta.env.DEV;

// Main (top-level) layout & pages
const Costcodes = lazy(() => import('@/modules/catalog/routes/costcodes.route'));
const MonthlyBillsRoute = lazy(() => import('@/modules/monthly-bills/routes/monthly-bills.route'));
const FinanceRoute = lazy(() => import('@/modules/finance/routes/finance.route'));
const EmailRoutes = lazy(() => import('@/modules/email/routes/email.route'));
const LookupRoutes = lazy(() => import('@/modules/lookup/routes/lookup.route'));
const DirectoryContacts = lazy(() => import('@/modules/directory/routes/contacts.route'));
const DirectoryGC = lazy(() => import('@/modules/directory/routes/gc.route'));
const DirectoryVendors = lazy(() => import('@/modules/directory/routes/vendors.route'));
const HrEmployees = lazy(() => import('@/modules/hr/routes/employees.route'));
const HrDepartments = lazy(() => import('@/modules/hr/routes/departments.route'));
const HrPTO = lazy(() => import('@/modules/hr/routes/pto.route'));
const TasksRoutes = lazy(() => import('@/modules/tasks/routes/tasks.route'));
const FilesRoutes = lazy(() => import('@/modules/files/routes/files.route'));
const ActivityLogRoutes = lazy(() => import('@/modules/activity-log/routes/activity-log.route'));
const ProfilePage = lazy(() => import('@/modules/profile/pages/profile-page'));
const ProjectsRoutes = lazy(() => import('@/modules/project/routes/projects.route'));
const SettingsRoutes = lazy(() => import('@/modules/settings/routes/settings.route'));

const ProjectRoutes = lazy(() => import('@/modules/project/routes/index.route'));

const UIKit = lazy(() => DelayForDemo(import('@/core/ui/pages/page'), 5000));
const PageHeaderKit = lazy(() =>
  import('@/core/ui/pages/page-header-kit').then((m) => ({ default: m.PageHeaderKit }))
);

function ProjectIndexRedirect() {
  const projectsQuery = useInfiniteProjectOptionsQuery({
    page: 1,
    size: 1,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const project = projectsQuery.data?.pages[0]?.data[0];

  if (project) {
    return <Navigate to={`/app/project/${encodeURIComponent(project.id)}/overview`} replace />;
  }

  if (projectsQuery.isLoading || projectsQuery.isFetching) {
    return <ModuleLoader />;
  }

  return <Navigate to="/app/projects" replace />;
}

/**
 * The create and edit routes every resource module owns.
 *
 * The singular name is declared once as `entityLabel` and drives three things:
 * the two document titles below, the placeholder crumb shown while a record's
 * own name loads, and the back link a detail header renders.
 */
function resourceRoutes(entityLabel: string) {
  return {
    breadcrumb: { entityLabel },
    children: [
      { path: 'create', title: `Create ${entityLabel}` },
      { path: ':id/edit', title: `Edit ${entityLabel}` },
    ],
  };
}

export const routeTree: RouteDef[] = [
  {
    path: '/',
    component: Outlet,
    children: [
      { path: 'lookup/*', component: LookupRoutes, title: 'Lookups', access: 'dev' },
      ...(isDev
        ? [
            { path: 'ui', component: UIKit, title: 'UI Kit', access: 'dev' as const },
            {
              path: 'ui/page-header',
              component: PageHeaderKit,
              title: 'Page Header Kit',
              access: 'dev' as const,
            },
          ]
        : []),

      { path: 'profile', component: ProfilePage, title: 'My Profile' },
      {
        path: 'settings/*',
        component: SettingsRoutes,
        title: 'Settings',
        children: [
          { path: 'members', title: 'Members & Roles' },
          { path: 'templates', title: 'Templates' },
          { path: 'integrations', title: 'Integrations' },
          { path: 'email-mailboxes', title: 'Common Inboxes' },
        ],
      },

      { path: 'projects/*', component: ProjectsRoutes, title: 'Projects' },
      { path: 'monthly-bills/*', component: MonthlyBillsRoute, title: 'Monthly Bills' },
      {
        path: 'finance/*',
        component: FinanceRoute,
        title: 'Finance',
        children: [
          { path: 'checking-register', title: 'Checking Register' },
          { path: 'payment-conflicts', title: 'Payment Conflicts' },
        ],
      },
      {
        path: 'email/*',
        component: EmailRoutes,
        title: 'Email',
        children: [
          // 'procurement'/'requisitions'/'contracts' were never real routes
          // under here — email.route.tsx only ever mounted 'accounts/*'. With
          // no child owning that segment, its breadcrumb lookup fell through
          // to this same 'email/*' entry a second time, showing "Email >
          // Email" (elli-ui#853). 'accounts' is a REST path detail, not a
          // navigational level, so it's hidden rather than titled.
          { path: 'accounts', breadcrumb: { label: 'Accounts', hide: true } },
          // The account slug segment has no static title of its own either —
          // without an entry here it fell through to 'email/*' the same way
          // 'accounts' did. The mailbox address is already shown in the
          // workspace header just below, so it's hidden rather than shown
          // twice as a raw slug.
          { path: 'accounts/:accountSlug', breadcrumb: { label: 'Account', hide: true } },
        ],
      },

      { path: 'project', component: ProjectIndexRedirect, title: 'Project' },
      {
        path: 'directory',
        component: () => NavigateTo({ to: '/app/directory/contacts' }),
        title: 'Directory',
      },
      {
        path: 'catalog/*',
        title: 'Catalog',
        access: { resource: 'costCode', action: 'read' },
        children: [
          {
            path: '',
            index: true,
            component: () => NavigateTo({ to: 'cost-codes' }),
          },
          {
            path: 'cost-codes/*',
            component: Costcodes,
            title: 'Cost Codes',
          },
        ],
      },
      { path: 'hr', component: () => NavigateTo({ to: '/app/hr/employees' }), title: 'HR' },
      {
        path: 'directory/contacts/*',
        component: DirectoryContacts,
        title: 'Contacts',
        ...resourceRoutes('Contact'),
      },
      {
        path: 'directory/general-contractors/*',
        component: DirectoryGC,
        title: 'General Contractors',
        ...resourceRoutes('General Contractor'),
      },
      {
        path: 'directory/vendors/*',
        component: DirectoryVendors,
        title: 'Vendors',
        ...resourceRoutes('Vendor'),
      },
      {
        path: 'hr/employees/*',
        component: HrEmployees,
        title: 'Employees',
        access: { resource: 'employee', action: 'read' },
        ...resourceRoutes('Employee'),
      },
      {
        path: 'hr/departments/*',
        component: HrDepartments,
        title: 'Departments',
        access: { resource: 'department', action: 'read' },
        ...resourceRoutes('Department'),
      },
      {
        path: 'hr/pto/*',
        component: HrPTO,
        title: 'Time Off',
        ...resourceRoutes('Time Off Request'),
      },
      {
        path: 'tasks/*',
        component: TasksRoutes,
        title: 'Tasks',
        access: { resource: 'task', action: 'read' },
      },
      { path: 'files/*', component: FilesRoutes, title: 'Files', access: 'admin' },
      {
        path: 'activity-log/*',
        component: ActivityLogRoutes,
        title: 'Activity Log',
        access: { resource: 'activityLog', action: 'read' },
      },
      {
        path: 'project/:projectId/*',
        component: ProjectRoutes,
        title: 'Project',
        breadcrumb: { label: 'Project' },
        children: [
          { path: 'overview', title: 'Project Overview' },
          { path: 'edit', title: 'Edit Project' },
          { path: 'files', title: 'Project Files' },
          { path: 'rfqs/*', title: 'RFQs', ...resourceRoutes('RFQ') },
          { path: 'invoices/*', title: 'Invoices', ...resourceRoutes('Invoice') },
          {
            path: 'purchase-orders/*',
            title: 'Purchase Orders',
            ...resourceRoutes('Purchase Order'),
          },
          { path: 'prime-change-orders/*', title: 'Prime Change Orders' },
          {
            path: 'sub-change-order/*',
            title: 'Sub Change Orders',
            ...resourceRoutes('Sub Change Order'),
          },
        ],
      },
      { path: '*', component: NotFound, title: 'Not Found' },
    ],
  },
].filter(Boolean) as RouteDef[]; // Filter out falsey values (like the dev-only route in production)
