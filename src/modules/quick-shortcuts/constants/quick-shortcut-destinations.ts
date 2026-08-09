import type { AccessContextValue } from '@/app/contexts/access-context';
import type { QuickShortcut } from '@/modules/quick-shortcuts/schemas/quick-shortcut.schema';

export type QuickShortcutDestination = {
  label: string;
  group: string;
  path: string;
  canAccess: (access: AccessContextValue) => boolean;
};

const hasProjectAccess = (access: AccessContextValue) =>
  Boolean(access.access && access.access.projectScope !== 'none');
const hasMonthlyBillsAccess = (access: AccessContextValue) =>
  access.isAdmin || ['accountant', 'ap', 'pm'].includes(access.access?.role ?? '');

export const QUICK_SHORTCUT_DESTINATIONS: QuickShortcutDestination[] = [
  {
    label: 'Projects',
    group: 'Workspace',
    path: '/app/projects',
    canAccess: hasProjectAccess,
  },
  {
    label: 'Monthly Bills',
    group: 'Workspace',
    path: '/app/monthly-bills',
    canAccess: hasMonthlyBillsAccess,
  },
  {
    label: 'Checking Register',
    group: 'Finance',
    path: '/app/finance/checking-register',
    canAccess: (access) => access.canAccessCheckingRegister,
  },
  {
    label: 'Payment Conflicts',
    group: 'Finance',
    path: '/app/finance/payment-conflicts',
    canAccess: (access) => access.can('quickBooksPaymentConflict', 'read'),
  },
  {
    label: 'Contacts',
    group: 'Directory',
    path: '/app/directory/contacts',
    canAccess: (access) => access.can('contact', 'read'),
  },
  {
    label: 'General Contractors',
    group: 'Directory',
    path: '/app/directory/general-contractors',
    canAccess: (access) => access.can('generalContractor', 'read'),
  },
  {
    label: 'Vendors',
    group: 'Directory',
    path: '/app/directory/vendors',
    canAccess: (access) => access.can('vendor', 'read'),
  },
  {
    label: 'Employees',
    group: 'HR',
    path: '/app/hr/employees',
    canAccess: (access) => access.can('employee', 'read'),
  },
  {
    label: 'Departments',
    group: 'HR',
    path: '/app/hr/departments',
    canAccess: (access) => access.can('department', 'read'),
  },
  {
    label: 'Time Off',
    group: 'HR',
    path: '/app/hr/pto',
    canAccess: (access) => access.can('leave', 'view') || access.can('leave', 'create'),
  },
  {
    label: 'Files',
    group: 'Workspace',
    path: '/app/files',
    canAccess: (access) => access.isAdmin,
  },
  {
    label: 'Cost Codes',
    group: 'Catalog',
    path: '/app/catalog/cost-codes',
    canAccess: (access) => access.can('costCode', 'read'),
  },
  {
    label: 'Activity Log',
    group: 'Workspace',
    path: '/app/activity-log',
    canAccess: (access) => access.can('activityLog', 'read'),
  },
  {
    label: 'Members & Roles',
    group: 'Settings',
    path: '/app/settings/members',
    canAccess: (access) => access.can('user', 'manage-permissions'),
  },
  {
    label: 'Templates',
    group: 'Settings',
    path: '/app/settings/templates',
    canAccess: (access) => access.can('template', 'read'),
  },
  {
    label: 'Integrations',
    group: 'Settings',
    path: '/app/settings/integrations',
    canAccess: (access) => access.can('integration', 'read'),
  },
  {
    label: 'My Profile',
    group: 'Personal',
    path: '/app/profile',
    canAccess: () => true,
  },
  {
    label: 'Lookups',
    group: 'Developer',
    path: '/app/lookup',
    canAccess: (access) => access.isDev,
  },
];

const destinationByPath = new Map(
  QUICK_SHORTCUT_DESTINATIONS.map((destination) => [destination.path, destination])
);

export function getQuickShortcutDestination(path: string | null) {
  return path ? destinationByPath.get(path) : undefined;
}

export function canAccessQuickShortcut(
  shortcut: QuickShortcut,
  access: AccessContextValue
): boolean {
  if (shortcut.destinationType === 'EXTERNAL') return true;
  return getQuickShortcutDestination(shortcut.internalPath)?.canAccess(access) ?? false;
}
