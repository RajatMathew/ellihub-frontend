import type { MenuConfig } from '@/app/config/types';
import { ProjectsNavGroup } from '@/app/components/sidebar/projects-nav-group';
import { ProjectSidebarSwitcher } from '@/modules/project/components/project-sidebar-switcher';
import { ArrowLeft } from 'lucide-react';

const isDev = import.meta.env.DEV;

// Order: Projects · Monthly Bills · Directory · HR · Files · Catalog ·
//        Activity Logger · Lookups · (UI Kit when dev)
// Per-item separators removed to match the Estimating sidebar — only real
// section boundaries (Projects switcher, Dev tools) get dividers.
export const mainSidebarMenu: MenuConfig = [
  {
    type: 'group-collapsed',
    title: 'Email',
    children: [
      { title: 'procurement@ellicorp.com', path: '../email/procurement' },
      { title: 'requisitions@ellicorp.com', path: '../email/requisitions' },
      { title: 'contracts@ellicorp.com', path: '../email/contracts' },
    ],
  },
  { type: 'custom', render: () => <ProjectsNavGroup /> },
  { type: 'separator' },
  {
    type: 'menu',
    children: [{ title: 'Monthly Bills', path: '../monthly-bills' }],
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
    children: [{ title: 'Activity Logger', path: '../activity-log' }],
  },
  {
    type: 'menu',
    children: [{ title: 'Lookups', path: '../lookup' }],
  },

  isDev && { type: 'separator' },
  isDev && {
    type: 'menu',
    children: [{ title: 'UI Kit', path: '../ui', badge: { variant: 'primary', text: 'Dev' } }],
  },
].filter(Boolean) as MenuConfig; // Filter out falsey values (like the dev-only menu in production)

// Project-context sidebar — kept intentionally minimal.
// All project sub-resources (Overview / GC / Vendor / Files) now live in the
// global Projects dropdown (see `ProjectsNavGroup`) and use the active
// project ID from the URL.
export const projectSidebarMenu: MenuConfig = [
  {
    type: 'menu',
    children: [{ title: 'Back to Projects', path: '../../projects', icon: ArrowLeft }],
  },
  { type: 'custom', render: () => <ProjectSidebarSwitcher /> },
];
