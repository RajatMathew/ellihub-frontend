import { ArrowLeft } from 'lucide-react';

import type { MenuConfig } from '@app/config/types';
import { ProjectSidebarSwitcher } from '@modules/project/components/project-sidebar-switcher';
import { ProjectSwitcher } from '@modules/project/project-switcher';

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
    type: 'menu',
    children: [
      { title: 'HR', path: '../hr' },
      { title: 'Files', path: '../files' },
    ],
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
  { type: 'custom', render: () => <ProjectSwitcher /> },
  { type: 'separator' },
  {
    type: 'menu',
    children: [{ title: 'Overview', path: '../overview' }],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'GC',
    children: [
      { title: 'Prime Contracts', path: '../contracts' },
      { title: 'Prime Change Orders', path: '../change-orders' },
    ],
  },
  { type: 'separator' },
  {
    type: 'group-collapsed',
    title: 'Vendor',
    children: [
      { title: 'RFQs', path: '../rfqs' },
      { title: 'Purchase Orders', path: '../vendors/purchase-orders' },
      { title: 'Change Orders', path: '../vendors/change-orders' },
      { title: 'Invoices', path: '../vendors/invoices' },
    ],
  },
  { type: 'separator' },
  {
    type: 'menu',
    children: [{ title: 'Files', path: '../files' }],
  },
];

export const projectsDetailSidebarMenu: MenuConfig = [
  {
    type: 'menu',
    children: [{ title: 'Back to Dashboard', path: '../../projects', icon: ArrowLeft }],
  },
  { type: 'separator' },
  { type: 'custom', render: () => <ProjectSidebarSwitcher /> },
  { type: 'separator' },
  {
    type: 'menu',
    children: [
      { title: 'Overview', path: '../overview' },
      { title: 'Prime Contracts', path: '../prime-contracts' },
      { title: 'Prime Change Orders', path: '../prime-change-orders' },
      { title: 'RFQs', path: '../rfqs' },
    ],
  },
];
