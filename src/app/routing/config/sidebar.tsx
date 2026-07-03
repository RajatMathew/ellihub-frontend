import type { MenuConfig } from '@/app/config/types';
import { ProjectSidebarSwitcher } from '@/modules/project/components/project-sidebar-switcher';
import { ArrowLeft } from 'lucide-react';

const isDev = import.meta.env.DEV;

export const mainSidebarMenu: MenuConfig = [
  {
    type: 'group-collapsed',
    title: 'Emails',
    children: [
      { title: 'procurement@ellicorp.com', path: '../email/procurement' },
      { title: 'requisitions@ellicorp.com', path: '../email/requisitions' },
      { title: 'contracts@ellicorp.com', path: '../email/contracts' },
    ],
  },
  {
    type: 'menu',
    children: [{ title: 'Projects', path: '../projects' }],
  },
  { type: 'separator' },
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
    type: 'group-collapsed',
    title: 'Finance',
    children: [
      {
        title: 'Checking Register',
        path: '../finance/checking-register',
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
    type: 'menu',
    children: [{ title: 'Files', path: '../files' }],
  },
  {
    type: 'group-collapsed',
    title: 'Catalog',
    children: [{ title: 'Cost Codes', path: '../catalog/cost-codes' }],
  },
  {
    type: 'menu',
    children: [{ title: 'Activity Log', path: '../activity-log' }],
  },
  {
    type: 'menu',
    children: [{ title: 'Lookups', path: '../lookup' }],
  },

  isDev && {
    type: 'menu',
    children: [{ title: 'UI Kit', path: '../ui', badge: { variant: 'primary', text: 'Dev' } }],
  },
].filter(Boolean) as MenuConfig; // Filter out falsey values (like the dev-only menu in production)

export const projectSidebarMenu: MenuConfig = [
  {
    type: 'menu',
    children: [{ title: 'Back to Projects', path: '../../projects', icon: ArrowLeft }],
  },
  { type: 'custom', render: () => <ProjectSidebarSwitcher /> },
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
