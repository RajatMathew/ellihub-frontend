import { lazy } from 'react';

import { NotFound } from '@/app/components/error/not-found';
import DelayForDemo from '@/app/lib/delay';
import { NavigateTo } from '@/app/lib/navigateTo';
import { Outlet } from 'react-router-dom';

import type { RouteDef } from './types';

const isDev = import.meta.env.DEV;

// Main (top-level) layout & pages
const Costcodes = lazy(() => import('@/modules/catalog/routes/costcodes.route'));
const MonthlyBillsRoute = lazy(() => import('@/modules/monthly-bills/routes/monthly-bills.route'));
const LookupRoutes = lazy(() => import('@/modules/lookup/routes/lookup.route'));
const DirectoryContacts = lazy(() => import('@/modules/directory/routes/contacts.route'));
const DirectoryGC = lazy(() => import('@/modules/directory/routes/gc.route'));
const DirectoryVendors = lazy(() => import('@/modules/directory/routes/vendors.route'));
const HrEmployees = lazy(() => import('@/modules/hr/routes/employees.route'));
const HrDepartments = lazy(() => import('@/modules/hr/routes/departments.route'));
const HrPTO = lazy(() => import('@/modules/hr/routes/pto.route'));
const FilesRoutes = lazy(() => import('@/modules/files/routes/files.route'));
const ActivityLogRoutes = lazy(() => import('@/modules/activity-log/routes/activity-log.route'));
const ProfilePage = lazy(() => import('@/modules/profile/pages/profile-page'));
const ProjectsRoutes = lazy(() => import('@/modules/project/routes/projects.route'));
const SettingsRoutes = lazy(() => import('@/modules/settings/routes/settings.route'));

const ProjectRoutes = lazy(() => import('@/modules/project/routes/index.route'));

const UIKit = lazy(() => DelayForDemo(import('@/core/ui/pages/page'), 5000));

function formRouteTitles(resourceName: string) {
  return [
    { path: 'create', title: `Create ${resourceName}` },
    { path: ':id/edit', title: `Edit ${resourceName}` },
  ];
}

export const routeTree: RouteDef[] = [
  {
    path: '/',
    component: Outlet,
    children: [
      { path: 'lookup/*', component: LookupRoutes, title: 'Lookups', access: 'dev' },
      ...(isDev ? [{ path: 'ui', component: UIKit, title: 'UI Kit', access: 'dev' }] : []),

      { path: 'profile', component: ProfilePage, title: 'My Profile' },
      {
        path: 'settings/*',
        component: SettingsRoutes,
        title: 'Settings',
        children: [
          { path: 'members', title: 'Members & Roles' },
          { path: 'templates', title: 'Templates' },
          { path: 'integrations', title: 'Integrations' },
        ],
      },

      { path: 'projects/*', component: ProjectsRoutes, title: 'Projects' },
      { path: 'monthly-bills/*', component: MonthlyBillsRoute, title: 'Monthly Bills' },

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
      {
        path: 'directory/contacts/*',
        component: DirectoryContacts,
        title: 'Contacts',
        children: formRouteTitles('Contact'),
      },
      {
        path: 'directory/general-contractors/*',
        component: DirectoryGC,
        title: 'General Contractors',
        children: formRouteTitles('General Contractor'),
      },
      {
        path: 'directory/vendors/*',
        component: DirectoryVendors,
        title: 'Vendors',
        children: formRouteTitles('Vendor'),
      },
      {
        path: 'hr/employees/*',
        component: HrEmployees,
        title: 'Employees',
        access: { resource: 'employee', action: 'read' },
        children: formRouteTitles('Employee'),
      },
      {
        path: 'hr/departments/*',
        component: HrDepartments,
        title: 'Departments',
        access: { resource: 'department', action: 'read' },
        children: formRouteTitles('Department'),
      },
      {
        path: 'hr/pto/*',
        component: HrPTO,
        title: 'Time Off',
        children: formRouteTitles('Time Off Request'),
      },
      { path: 'files/*', component: FilesRoutes, title: 'Files', access: 'admin' },
      {
        path: 'activity-log/*',
        component: ActivityLogRoutes,
        title: 'Activity Logger',
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
          { path: 'rfqs/*', title: 'RFQs', children: formRouteTitles('RFQ') },
          { path: 'invoices/*', title: 'Invoices', children: formRouteTitles('Invoice') },
          {
            path: 'purchase-orders/*',
            title: 'Purchase Orders',
            children: formRouteTitles('Purchase Order'),
          },
          { path: 'prime-change-orders/*', title: 'Prime Change Orders' },
          {
            path: 'sub-change-order/*',
            title: 'Sub Change Orders',
            children: formRouteTitles('Sub Change Order'),
          },
        ],
      },
      { path: '*', component: NotFound, title: 'Not Found' },
    ],
  },
].filter(Boolean) as RouteDef[]; // Filter out falsey values (like the dev-only route in production)
