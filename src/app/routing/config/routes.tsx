import { lazy } from 'react';

import { Outlet } from 'react-router-dom';

import { NotFound } from '@app/components/error/not-found';
import DelayForDemo from '@app/lib/delay';
import { NavigateTo } from '@app/lib/navigateTo';

import type { RouteDef } from './types';

const isDev = import.meta.env.DEV;

// Main (top-level) layout & pages
const Costcodes = lazy(() => import('@modules/catalog/routes/costcodes.route'));
const DirectoryContacts = lazy(() => import('@modules/directory/routes/contacts.route'));
const DirectoryGC = lazy(() => import('@modules/directory/routes/gc.route'));
const DirectoryVendors = lazy(() => import('@modules/directory/routes/vendors.route'));
const HrEmployees = lazy(() => import('@modules/hr/routes/employees.route'));
const HrDepartments = lazy(() => import('@modules/hr/routes/departments.route'));
const HrPTO = lazy(() => import('@modules/hr/routes/pto.route'));
const FilesRoutes = lazy(() => import('@modules/files/routes/files.route'));
const ProjectsRoutes = lazy(() => import('@modules/project/routes/projects.route'));

// Project layout & pages
// const ProjectLayout = lazy(() => import('@modules/project'));
// const ProjectOverview = lazy(() => import('@modules/project/pages/project-contract-overview'));
// const ProjectContracts = lazy(() => import('@modules/project/pages/contracts'));
// const ProjectChangeOrders = lazy(() => import('@modules/project/pages/change-orders'));
// const RFQListPage = lazy(() => import('@modules/project/pages/rfq-list'));
// const RFQFormPage = lazy(() => import('@modules/project/pages/rfq-form'));
// const RFQDetailPage = lazy(() => import('@modules/project/pages/rfq-detail'));
// const ProjectPOs = lazy(() => import('@/modules/project/pages/purchase-order'));
// const ProjectSCOList = lazy(() => import('@/modules/project/pages/sub-change-order'));
// const ProjectInvoices = lazy(() => import('@modules/project/pages/invoices'));
// const ProjectFiles = lazy(() => import('@modules/project/pages/files'));
const ProjectRoutes = lazy(() => import('@modules/project/routes/index.route'));

const UIKit = lazy(() => DelayForDemo(import('@core/ui/pages/page'), 5000));

export const routeTree: RouteDef[] = [
  {
    path: '/',
    component: Outlet,
    children: [
      ...(isDev ? [{ path: 'ui', component: UIKit, title: 'UI Kit' }] : []),

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
      // Project routes (nested under /project/:projectId/*)
      // {
      //   path: 'project/:projectId',
      //   component: ProjectLayout,
      //   title: 'Project',
      //   breadcrumb: { label: 'Project' },
      //   children: [
      //     { path: '', component: () => NavigateTo({ to: 'overview' }), index: true },
      //     { path: 'overview', component: ProjectOverview, title: 'Overview' },
      //     {
      //       path: 'contracts',
      //       component: ProjectContracts,
      //       title: 'Prime Contracts',
      //     },
      //     {
      //       path: 'change-orders',
      //       component: ProjectChangeOrders,
      //       title: 'Prime Change Orders',
      //     },
      //     {
      //       path: 'rfqs',
      //       title: 'RFQs',
      //       children: [
      //         { path: '', component: RFQListPage, index: true },
      //         { path: 'create', component: RFQFormPage, title: 'New RFQ' },
      //         { path: ':rfqId', component: RFQDetailPage, title: 'RFQ Detail' },
      //         { path: ':rfqId/edit', component: RFQFormPage, title: 'Edit RFQ' },
      //       ],
      //     },
      //     {
      //       path: 'purchase-orders',
      //       component: ProjectPOs,
      //       title: 'Purchase Orders',
      //     },
      //     {
      //       path: 'vendors/change-orders',
      //       component: ProjectSCOList,
      //       title: 'Change Orders',
      //     },
      //     {
      //       path: 'vendors/invoices',
      //       component: ProjectInvoices,
      //       title: 'Invoices',
      //     },
      //     { path: 'files', component: ProjectFiles, title: 'Files' },
      //   ],
      // },
      { path: '*', component: NotFound, title: 'Not Found' },
    ],
  },
].filter(Boolean) as RouteDef[]; // Filter out falsey values (like the dev-only route in production)
