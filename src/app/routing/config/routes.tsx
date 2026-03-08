/* eslint-disable react-refresh/only-export-components -- routeTree is config data, components are for routing */

import { lazy } from 'react';

import { Navigate, Outlet } from 'react-router-dom';

import FutureFeature from '@app/components/error/future-feature';
import { NotFound } from '@app/components/error/not-found';
import DelayForDemo from '@app/lib/delay';

import type { RouteDef } from './types';

function NavigateTo({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

const isDev = import.meta.env.DEV;

// Main (top-level) layout & pages
const Costcodes = lazy(() => import('@modules/catalog/routes/costcodes.route'));
const DirectoryContacts = lazy(() => import('@modules/directory/routes/contacts.route'));
const DirectoryGC = lazy(() => import('@modules/directory/routes/gc.route'));
const DirectoryVendors = lazy(() => import('@modules/directory/routes/vendors.route'));

// Project layout & pages
const ProjectLayout = lazy(() => import('@modules/project'));
const ProjectOverview = lazy(() => import('@modules/project/pages/overview'));
const ProjectContracts = lazy(() => import('@modules/project/pages/contracts'));
const ProjectChangeOrders = lazy(() => import('@modules/project/pages/change-orders'));
const RFQListPage = lazy(() => import('@modules/project/pages/rfq-list'));
const RFQFormPage = lazy(() => import('@modules/project/pages/rfq-form'));
const RFQDetailPage = lazy(() => import('@modules/project/pages/rfq-detail'));
const FilesRoutes = lazy(() => import('@modules/files/routes/files.route'));
const ProjectPOs = lazy(() => import('@modules/project/pages/purchase-orders'));
const ProjectVendorCOs = lazy(() => import('@modules/project/pages/vendor-change-orders'));
const ProjectInvoices = lazy(() => import('@modules/project/pages/invoices'));
const ProjectFiles = lazy(() => import('@modules/project/pages/files'));
const ProjectRoutes = lazy(() => import('@modules/project/routes/projects.route'));

const UIKit = lazy(() => DelayForDemo(import('@core/ui/pages/page'), 5000));

export const routeTree: RouteDef[] = [
  {
    component: Outlet,
    children: [
      isDev ? { path: 'ui', component: UIKit, title: 'UI Kit' } : null,

      { path: 'projects/*', component: ProjectRoutes, title: 'Projects' },

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
      { path: 'hr', component: FutureFeature, title: 'HR' },
      { path: 'files/*', component: FilesRoutes, title: 'Files' },
      // Project routes (nested under /project/:projectId/*)
      {
        path: 'project/:projectId',
        component: ProjectLayout,
        title: 'Project',
        breadcrumb: { label: 'Project' },
        children: [
          { path: '', component: () => NavigateTo({ to: 'overview' }), index: true },
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
          {
            path: 'rfqs',
            title: 'RFQs',
            children: [
              { path: '', component: RFQListPage, index: true },
              { path: 'create', component: RFQFormPage, title: 'New RFQ' },
              { path: ':rfqId', component: RFQDetailPage, title: 'RFQ Detail' },
              { path: ':rfqId/edit', component: RFQFormPage, title: 'Edit RFQ' },
            ],
          },
          {
            path: 'purchase-orders',
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
      { path: '*', component: NotFound, title: 'Not Found' },
    ],
  },
].filter(Boolean) as RouteDef[]; // Filter out falsey values (like the dev-only route in production)
