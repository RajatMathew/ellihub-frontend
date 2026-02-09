/* eslint-disable react-refresh/only-export-components -- routeTree is config data, components are for routing */

import { lazy } from 'react';

import { Navigate } from 'react-router-dom';

import DelayForDemo from '@app/lib/delay';

import type { RouteDef } from './types';

function NavigateToOverview() {
  return <Navigate to="overview" replace />;
}

const isDev = import.meta.env.DEV;

// Main (top-level) layout & pages
const MainLayout = lazy(() => import('@modules/main'));
const MainProjects = lazy(() => import('@modules/main/pages/projects'));
const MainCostCodes = lazy(() => import('@modules/main/pages/cost-codes'));
const MainContacts = lazy(() => import('@modules/main/pages/contacts'));
const MainGeneralContracts = lazy(() => import('@modules/main/pages/general-contracts'));
const MainVendors = lazy(() => import('@modules/main/pages/vendors'));
const MainHr = lazy(() => import('@modules/main/pages/hr'));
const MainFiles = lazy(() => import('@modules/main/pages/files'));

// Project layout & pages
const ProjectLayout = lazy(() => import('@modules/project'));
const ProjectOverview = lazy(() => import('@modules/project/pages/overview'));
const ProjectContracts = lazy(() => import('@modules/project/pages/contracts'));
const ProjectChangeOrders = lazy(() => import('@modules/project/pages/change-orders'));
const ProjectRfqs = lazy(() => import('@modules/project/pages/rfqs'));
const ProjectPOs = lazy(() => import('@modules/project/pages/purchase-orders'));
const ProjectVendorCOs = lazy(() => import('@modules/project/pages/vendor-change-orders'));
const ProjectInvoices = lazy(() => import('@modules/project/pages/invoices'));
const ProjectFiles = lazy(() => import('@modules/project/pages/files'));

const UIKit = lazy(() => DelayForDemo(import('@core/ui/pages/page'), 5000));

export const routeTree: RouteDef[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      isDev ? { path: 'ui', component: UIKit, title: 'UI Kit' } : null,

      { path: 'projects', component: MainProjects, title: 'Projects' },
      {
        path: 'catalog/cost-codes',
        component: MainCostCodes,
        title: 'Cost Codes',
      },
      {
        path: 'directory/contacts',
        component: MainContacts,
        title: 'Contacts',
      },
      {
        path: 'directory/general-contracts',
        component: MainGeneralContracts,
        title: 'General Contracts',
      },
      {
        path: 'directory/vendors',
        component: MainVendors,
        title: 'Vendors',
      },
      { path: 'hr', component: MainHr, title: 'HR' },
      { path: 'files', component: MainFiles, title: 'Files' },
      {
        path: 'project/:projectId',
        component: ProjectLayout,
        title: 'Project',
        breadcrumb: { label: 'Project' },
        children: [
          { path: '', component: NavigateToOverview },
          { path: 'overview', component: ProjectOverview, title: 'Overview' },
          {
            path: 'contracts',
            component: ProjectContracts,
            title: 'Prime Contracts',
          },
          {
            path: 'change-orders',
            component: ProjectChangeOrders,
            title: 'Prime Change Orders',
          },
          { path: 'rfqs', component: ProjectRfqs, title: 'RFQs' },
          {
            path: 'vendors/purchase-orders',
            component: ProjectPOs,
            title: 'Purchase Orders',
          },
          {
            path: 'vendors/change-orders',
            component: ProjectVendorCOs,
            title: 'Change Orders',
          },
          {
            path: 'vendors/invoices',
            component: ProjectInvoices,
            title: 'Invoices',
          },
          { path: 'files', component: ProjectFiles, title: 'Files' },
        ],
      },
    ],
  },
].filter(Boolean) as RouteDef[]; // Filter out falsey values (like the dev-only route in production)
