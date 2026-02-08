import { ArrowLeft } from 'lucide-react';

import type { MenuConfig } from '@app/config/types';
import { ProjectSwitcher } from '@modules/project/project-switcher';

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
      { title: 'General Contracts', path: '../directory/general-contracts' },
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
];

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
