import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

import type { MenuConfig, MenuItem, MenuProjectActionRule } from '@app/config/types';
import type { AccessContextValue } from '@app/contexts/access-context';

/**
 * Which sidebar entries the signed-in user sees.
 *
 * Kept apart from `SidebarBuilder` so the rules can be tested without rendering
 * anything: an entry declares its audience (`access`, `adminOnly`,
 * `adminOrDevOnly`), and the path rules below cover the entries that predate
 * declaring one. Prefer `access` — a `{ resource, action }` from the
 * permission vocabulary in elli-core's `permissions.ts` — for anything new, so
 * the sidebar, the route and the API all answer to the same grant.
 */

export type SidebarAccess = Pick<
  AccessContextValue,
  'access' | 'isAdmin' | 'isDev' | 'canAccessCheckingRegister' | 'can'
>;

function compactSeparators(menu: MenuConfig): MenuConfig {
  return menu.filter((item, index) => {
    if (item.type !== 'separator') return true;
    const previous = menu[index - 1];
    const next = menu[index + 1];
    return Boolean(previous && next && previous.type !== 'separator' && next.type !== 'separator');
  });
}

function canUseProjectAction(
  project: ProjectDetail | undefined,
  rule: MenuProjectActionRule | undefined
) {
  if (!rule) return true;
  return project?.capabilities?.actions?.[rule.resource]?.[rule.action] === true;
}

function applyMenuActionAccess(
  child: MenuItem,
  access: SidebarAccess,
  project: ProjectDetail | undefined
): MenuItem | null {
  if (child.access && !access.can(child.access.resource, child.access.action)) return null;
  if (!canUseProjectAction(project, child.projectAction)) return null;

  const canCreate =
    (!child.createAccess || access.can(child.createAccess.resource, child.createAccess.action)) &&
    canUseProjectAction(project, child.createProjectAction);

  if (canCreate || !child.createPath) return child;

  const { createPath: _createPath, createTitle: _createTitle, ...rest } = child;
  return rest;
}

function filterProjectMenuForAccess(
  menuConfig: MenuConfig,
  access: SidebarAccess,
  project: ProjectDetail | undefined
): MenuConfig {
  const filtered = menuConfig
    .map((item) => {
      if (item.type === 'separator' || item.type === 'custom') return item;
      if (!item.children) return applyMenuActionAccess(item, access, project);

      const children = item.children
        .map((child) => applyMenuActionAccess(child, access, project))
        .filter(Boolean) as MenuConfig;

      if (children.length === 0) return null;
      return { ...item, children };
    })
    .filter(Boolean) as MenuConfig;

  return compactSeparators(filtered);
}

export function filterMenuForAccess(
  menuConfig: MenuConfig,
  isProjectSidebar: boolean,
  access: SidebarAccess,
  project: ProjectDetail | undefined
): MenuConfig {
  if (isProjectSidebar) return filterProjectMenuForAccess(menuConfig, access, project);

  const filtered = menuConfig
    .map((item) => {
      if (item.type === 'separator' || item.type === 'custom') return item;
      if (item.adminOnly && !(access.isAdmin || access.isDev)) return null;
      if (item.adminOrDevOnly && !(access.isAdmin || access.isDev)) return null;
      if (!item.children) return null;

      const children = item.children
        .filter((child) => {
          if (child.adminOnly && !(access.isAdmin || access.isDev)) return false;
          if (child.adminOrDevOnly && !(access.isAdmin || access.isDev)) return false;
          if (child.disabled) return true;
          if (child.access) return access.can(child.access.resource, child.access.action);
          const path = child.path ?? '';
          if (path.includes('projects')) return access.access?.projectScope !== 'none';
          if (path.includes('monthly-bills')) {
            return (
              access.isAdmin ||
              access.access?.role === 'pm' ||
              access.access?.role === 'accountant' ||
              access.access?.role === 'ap'
            );
          }
          if (path.includes('finance/checking-register')) return access.canAccessCheckingRegister;
          if (path.includes('email')) return true;
          if (path.includes('catalog/cost-codes')) return access.isAdmin || access.isDev;
          if (path.includes('directory/contacts')) return access.can('contact', 'read');
          if (path.includes('directory/general-contractors')) {
            return access.can('generalContractor', 'read');
          }
          if (path.includes('directory/vendors')) return access.can('vendor', 'read');
          if (path.includes('hr/employees')) return access.can('employee', 'read');
          if (path.includes('hr/departments')) return access.can('department', 'read');
          if (path.includes('hr/pto'))
            return access.can('leave', 'view') || access.can('leave', 'create');
          if (path.includes('files')) return access.isAdmin || access.isDev;
          if (path.includes('activity-log')) return access.can('activityLog', 'read');
          if (path.includes('settings')) {
            return access.can('user', 'manage-permissions') || access.can('template', 'read');
          }
          if (path.includes('lookup')) return access.isAdmin || access.isDev;
          if (path.includes('ui')) return access.isDev;
          return false;
        })
        .map((child) => applyMenuActionAccess(child, access, project))
        .filter(Boolean) as MenuConfig;

      if (children.length === 0) return null;
      return { ...item, children };
    })
    .filter(Boolean) as MenuConfig;

  return compactSeparators(filtered);
}
