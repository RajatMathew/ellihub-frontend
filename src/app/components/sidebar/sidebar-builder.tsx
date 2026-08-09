import { memo, useMemo } from 'react';

import { useProjectDetailQuery } from '@/modules/project/hooks';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';
import { useLocation } from 'react-router-dom';

import type { MenuConfig, MenuItem, MenuProjectActionRule } from '@app/config/types';
import { useAccess } from '@app/contexts/access-context';

import { Separator } from '../ui/separator';
import SidebarCustomMenu from './sidebar-menu-custom';
import { SidebarGroupMenu } from './sidebar-menu-group';
import { SidebarPrimaryMenu } from './sidebar-menu-primary';

type Props = {
  menuConfig: MenuConfig;
};

function compactSeparators(menu: MenuConfig): MenuConfig {
  return menu.filter((item, index) => {
    if (item.type !== 'separator') return true;
    const previous = menu[index - 1];
    const next = menu[index + 1];
    return Boolean(previous && next && previous.type !== 'separator' && next.type !== 'separator');
  });
}

function getProjectIdFromPath(pathname: string): string {
  return pathname.match(/^\/app\/project\/([^/]+)/)?.[1] ?? '';
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
  access: ReturnType<typeof useAccess>,
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
  access: ReturnType<typeof useAccess>,
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

function filterMenuForAccess(
  menuConfig: MenuConfig,
  isProjectSidebar: boolean,
  access: ReturnType<typeof useAccess>,
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
          if (path.includes('finance/checking-register')) return access.isAdmin || access.isDev;
          if (path.includes('finance/payment-conflicts')) return access.isAdmin || access.isDev;
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

const SidebarBuilder = ({ menuConfig }: Props) => {
  const access = useAccess();
  const location = useLocation();
  const isProjectSidebar = location.pathname.includes('/app/project/');
  const projectId = isProjectSidebar ? getProjectIdFromPath(location.pathname) : '';
  const { data: project } = useProjectDetailQuery(projectId);
  const accessibleMenuConfig = useMemo(
    () => filterMenuForAccess(menuConfig, isProjectSidebar, access, project),
    [access, isProjectSidebar, menuConfig, project]
  );

  const renderedMenu = useMemo(() => {
    return accessibleMenuConfig.map((group, index) => {
      const key = `${group.type}-${group.title ?? ''}-${index}`;

      switch (group.type) {
        case 'group':
        case 'group-collapsed':
          return <SidebarGroupMenu key={key} menu={[group]} name={key} />;

        case 'menu':
          return <SidebarPrimaryMenu key={key} menu={[group]} />;

        case 'custom':
          return <SidebarCustomMenu key={key} menu={[group]} />;

        case 'separator':
          return <Separator key={key} className="my-1 opacity-70" />;

        default:
          return null;
      }
    });
  }, [accessibleMenuConfig]);

  return <div className="flex min-h-full w-full min-w-0 flex-col gap-0.5 pt-2">{renderedMenu}</div>;
};

export default memo(SidebarBuilder);
