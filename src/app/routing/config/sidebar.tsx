import type { MenuConfig } from '@/app/config/types';
import { EmailSidebarMenu } from '@/modules/email/components/email-sidebar-menu';
import { ProjectSidebarSwitcher } from '@/modules/project/components/project-sidebar-switcher';
import { QuickShortcutsSidebarMenu } from '@/modules/quick-shortcuts/components/quick-shortcuts-sidebar-menu';
import { ArrowLeft } from 'lucide-react';

export const mainSidebarMenu: MenuConfig = [
  {
    type: 'custom',
    render: () => <EmailSidebarMenu />,
  },
  {
    type: 'menu',
    children: [{ title: 'Projects', path: '../projects' }],
  },
  {
    type: 'custom',
    render: () => <QuickShortcutsSidebarMenu />,
  },
  {
    type: 'menu',
    children: [{ title: 'Requisitions', disabled: true }],
  },
  {
    type: 'menu',
    children: [
      {
        title: 'Monthly Bills',
        path: '../monthly-bills',
      },
    ],
  },
  {
    type: 'menu',
    children: [{ title: 'Files', path: '../files' }],
  },
  {
    type: 'group-collapsed',
    title: 'Finance',
    collapse: false,
    children: [
      { title: 'Check Register', path: '../finance/checking-register' },
      {
        title: 'Payment Conflicts',
        path: '../finance/payment-conflicts',
        adminOrDevOnly: true,
      },
      // Placeholders until the pages exist. Administrators only, by the same
      // grants elli-core gives dev and admin alone (`permissions.ts`), so the
      // pages can guard on them too when they arrive.
      {
        title: 'Project Executives',
        disabled: true,
        access: { resource: 'projectExecutive', action: 'read' },
      },
      { title: 'Loans', disabled: true, access: { resource: 'loan', action: 'read' } },
      { title: 'Cost Codes', path: '../catalog/cost-codes', adminOnly: true },
    ],
  },
  {
    type: 'group-collapsed',
    title: 'HR',
    children: [
      {
        title: 'Employees',
        path: '../hr/employees',
        createPath: true,
        createTitle: 'Create Employee',
        createAccess: { resource: 'employee', action: 'create' },
      },
      {
        title: 'Departments',
        path: '../hr/departments',
        createPath: true,
        createTitle: 'Create Department',
        createAccess: { resource: 'department', action: 'create' },
      },
      {
        title: 'Time Off',
        path: '../hr/pto',
        createPath: true,
        createTitle: 'Create Time Off',
        createAccess: { resource: 'leave', action: 'create' },
      },
    ],
  },
  {
    type: 'group-collapsed',
    title: 'Directory',
    children: [
      {
        title: 'Contacts',
        path: '../directory/contacts',
        createPath: true,
        createTitle: 'Create Contact',
        createAccess: { resource: 'contact', action: 'create' },
      },
      {
        title: 'General Contractors',
        path: '../directory/general-contractors',
        createPath: true,
        createTitle: 'Create GC',
        createAccess: { resource: 'generalContractor', action: 'create' },
      },
      {
        title: 'Vendors',
        path: '../directory/vendors',
        createPath: true,
        createTitle: 'Create Vendor',
        createAccess: { resource: 'vendor', action: 'create' },
      },
    ],
  },
  {
    type: 'group-collapsed',
    title: 'Admin',
    adminOrDevOnly: true,
    children: [
      { title: 'Members & Roles', path: '../settings/members', adminOrDevOnly: true },
      { title: 'Integrations', path: '../settings/integrations' },
      { title: 'Activity Log', path: '../activity-log' },
      { title: 'Lookups', path: '../lookup', adminOrDevOnly: true },
    ],
  },
];

export const projectSidebarMenu: MenuConfig = [
  {
    type: 'menu',
    children: [{ title: 'Back to Projects', path: '../../projects', icon: ArrowLeft }],
  },
  { type: 'custom', render: () => <ProjectSidebarSwitcher /> },
  {
    type: 'custom',
    render: () => <QuickShortcutsSidebarMenu />,
  },
  {
    type: 'menu',
    children: [{ title: 'Overview', path: '../overview' }],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'GC',
    collapse: false,
    children: [
      {
        title: 'Prime Change Orders',
        path: '../prime-change-orders',
        access: { resource: 'primeChangeOrder', action: 'read' },
      },
    ],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'Vendor',
    collapse: false,
    children: [
      {
        title: 'RFQs',
        path: '../rfqs',
        createPath: true,
        createTitle: 'Create RFQ',
        access: { resource: 'rfq', action: 'read' },
        createProjectAction: { resource: 'rfq', action: 'create' },
      },
      {
        title: 'Purchase Orders',
        path: '../purchase-orders',
        createPath: true,
        createTitle: 'Create PO',
        access: { resource: 'purchaseOrder', action: 'read' },
        createProjectAction: { resource: 'purchaseOrder', action: 'create' },
      },
      {
        title: 'Sub Change Order',
        path: '../sub-change-order',
        createPath: true,
        createTitle: 'Create SCO',
        access: { resource: 'subChangeOrder', action: 'read' },
        createProjectAction: { resource: 'subChangeOrder', action: 'create' },
      },
      {
        title: 'Invoices',
        path: '../invoices',
        createPath: true,
        createTitle: 'Create Invoice',
        access: { resource: 'invoice', action: 'read' },
        createProjectAction: { resource: 'invoice', action: 'create' },
      },
    ],
  },
  { type: 'separator' },
  {
    type: 'menu',
    children: [{ title: 'Files', path: '../files', access: { resource: 'file', action: 'read' } }],
  },
];
