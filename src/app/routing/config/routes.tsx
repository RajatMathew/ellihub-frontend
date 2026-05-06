import { lazy } from 'react';

import { NotFound } from '@/app/components/error/not-found';
import DelayForDemo from '@/app/lib/delay';
import { NavigateTo } from '@/app/lib/navigateTo';
import { Outlet } from 'react-router-dom';

import type { RouteDef } from './types';

const isDev = import.meta.env.DEV;

// Main (top-level) layout & pages
const Costcodes = lazy(() => import('@/modules/catalog/routes/costcodes.route'));
const LookupRoutes = lazy(() => import('@/modules/lookup/routes/lookup.route'));
const DirectoryContacts = lazy(() => import('@/modules/directory/routes/contacts.route'));
const DirectoryGC = lazy(() => import('@/modules/directory/routes/gc.route'));
const DirectoryVendors = lazy(() => import('@/modules/directory/routes/vendors.route'));
const HrEmployees = lazy(() => import('@/modules/hr/routes/employees.route'));
const HrDepartments = lazy(() => import('@/modules/hr/routes/departments.route'));
const HrPTO = lazy(() => import('@/modules/hr/routes/pto.route'));
const FilesRoutes = lazy(() => import('@/modules/files/routes/files.route'));
const ProfilePage = lazy(() => import('@/modules/profile/pages/profile-page'));
const ProjectsRoutes = lazy(() => import('@/modules/project/routes/projects.route'));

const ProjectRoutes = lazy(() => import('@/modules/project/routes/index.route'));

const UIKit = lazy(() => DelayForDemo(import('@/core/ui/pages/page'), 5000));

export const routeTree: RouteDef[] = [
  {
    path: '/',
    component: Outlet,
    children: [
      { path: 'lookup/*', component: LookupRoutes, title: 'Lookups' },
      ...(isDev ? [{ path: 'ui', component: UIKit, title: 'UI Kit' }] : []),

      { path: 'profile', component: ProfilePage, title: 'My Profile' },

      { path: 'projects/*', component: ProjectsRoutes, title: 'Projects' },

      {
        path: 'catalog/*',
        title: 'Catalog',
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
      },
      {
        path: 'directory/general-contractors/*',
        component: DirectoryGC,
        title: 'General Contractors',
      },
      {
        path: 'directory/vendors/*',
        component: DirectoryVendors,
        title: 'Vendors',
      },
      {
        path: 'hr/employees/*',
        component: HrEmployees,
        title: 'Employees',
      },
      {
        path: 'hr/departments/*',
        component: HrDepartments,
        title: 'Departments',
      },
      {
        path: 'hr/pto/*',
        component: HrPTO,
        title: 'Time Off',
      },
      { path: 'files/*', component: FilesRoutes, title: 'Files' },
      {
        path: 'project/:projectId/*',
        component: ProjectRoutes,
        title: 'Project',
        breadcrumb: { label: 'Project' },
      },
      { path: '*', component: NotFound, title: 'Not Found' },
    ],
  },
].filter(Boolean) as RouteDef[]; // Filter out falsey values (like the dev-only route in production)
