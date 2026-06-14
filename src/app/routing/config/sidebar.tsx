import type { MenuConfig } from '@/app/config/types';
import { ProjectSidebarSwitcher } from '@/modules/project/components/project-sidebar-switcher';
import { ArrowLeft } from 'lucide-react';

const isDev = import.meta.env.DEV;

export const mainSidebarMenu: MenuConfig = [
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
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'Catalog',
    children: [{ title: 'Cost Codes', path: '../catalog/cost-codes' }],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'Directory',
    children: [
      {
        title: 'Contacts',
        path: '../directory/contacts',
        createPath: true,
        createTitle: 'Create Contact',
      },
      {
        title: 'General Contractors',
        path: '../directory/general-contractors',
        createPath: true,
        createTitle: 'Create GC',
      },
      {
        title: 'Vendors',
        path: '../directory/vendors',
        createPath: true,
        createTitle: 'Create Vendor',
      },
    ],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'HR',
    children: [
      {
        title: 'Employees',
        path: '../hr/employees',
        createPath: true,
        createTitle: 'Create Employee',
      },
      {
        title: 'Departments',
        path: '../hr/departments',
        createPath: true,
        createTitle: 'Create Department',
      },
      { title: 'Time Off', path: '../hr/pto', createPath: true, createTitle: 'Create Time Off' },
    ],
  },
  { type: 'separator' },
  {
    type: 'menu',
    children: [{ title: 'Files', path: '../files' }],
  },
  {
    type: 'separator',
  },
  {
    type: 'menu',
    children: [{ title: 'Activity Logger', path: '../activity-log' }],
  },
  {
    type: 'separator',
  },
  {
    type: 'menu',
    children: [{ title: 'Lookups', path: '../lookup' }],
  },

  isDev && {
    type: 'separator',
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
    children: [{ title: 'Prime Change Orders', path: '../prime-change-orders' }],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'Vendor',
    children: [
      { title: 'RFQs', path: '../rfqs', createPath: true, createTitle: 'Create RFQ' },
      {
        title: 'Purchase Orders',
        path: '../purchase-orders',
        createPath: true,
        createTitle: 'Create PO',
      },
      {
        title: 'Sub Change Order',
        path: '../sub-change-order',
        createPath: true,
        createTitle: 'Create SCO',
      },
      { title: 'Invoices', path: '../invoices', createPath: true, createTitle: 'Create Invoice' },
    ],
  },
  { type: 'separator' },
  {
    type: 'menu',
    children: [{ title: 'Files', path: '../files' }],
  },
];
