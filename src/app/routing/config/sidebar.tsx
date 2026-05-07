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
    type: 'group-collapsed',
    title: 'Catalog',
    children: [{ title: 'Cost Codes', path: '../catalog/cost-codes' }],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'Directory',
    children: [
      { title: 'Contacts', path: '../directory/contacts' },
      { title: 'General Contractors', path: '../directory/general-contractors' },
      { title: 'Vendors', path: '../directory/vendors' },
    ],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'HR',
    children: [
      { title: 'Employees', path: '../hr/employees' },
      { title: 'Departments', path: '../hr/departments' },
      { title: 'Time Off', path: '../hr/pto' },
    ],
  },
  { type: 'separator' },
  {
    type: 'menu',
    children: [{ title: 'Files', path: '../files' }],
  },
  {
    type: 'menu',
    children: [{ title: 'Integrations', path: '../integrations' }],
  },
  {
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
  { type: 'separator' },
  { type: 'custom', render: () => <ProjectSidebarSwitcher /> },
  { type: 'separator' },
  {
    type: 'menu',
    children: [
      { title: 'Overview', path: '../overview' },
      { title: 'Files', path: '../files' },
    ],
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
      { title: 'RFQs', path: '../rfqs' },
      { title: 'Purchase Orders', path: '../purchase-orders' },
      { title: 'Sub Change Order', path: '../sub-change-order' },
      { title: 'Invoices', path: '../invoices' },
    ],
  },
];
