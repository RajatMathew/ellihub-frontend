import { memo, useMemo } from 'react';

import { useLocation } from 'react-router-dom';

import type { MenuConfig } from '@app/config/types';
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

function filterMenuForAccess(
  menuConfig: MenuConfig,
  isProjectSidebar: boolean,
  access: ReturnType<typeof useAccess>
): MenuConfig {
  if (isProjectSidebar) return menuConfig;

  const filtered = menuConfig
    .map((item) => {
      if (item.type === 'separator') return item;
      // Custom-render groups manage their own access internally; let them through.
      if (item.type === 'custom') return item;
      if (!item.children) return null;

      const children = item.children.filter((child) => {
        const path = child.path ?? '';
        // Email mailboxes are visible to everyone — no per-mailbox gating yet.
        if (path.includes('email/')) return true;
        if (path.includes('projects')) return access.access?.projectScope !== 'none';
        if (path.includes('monthly-bills')) {
          return (
            access.isAdmin || access.access?.role === 'pm' || access.access?.role === 'accountant'
          );
        }
        if (path.includes('catalog/cost-codes')) return access.can('costCode', 'read');
        if (path.includes('directory/contacts')) return access.can('contact', 'read');
        if (path.includes('directory/general-contractors')) {
          return access.can('generalContractor', 'read');
        }
        if (path.includes('directory/vendors')) return access.can('vendor', 'read');
        if (path.includes('hr/employees')) return access.can('employee', 'read');
        if (path.includes('hr/departments')) return access.can('department', 'read');
        if (path.includes('hr/pto'))
          return access.can('leave', 'view') || access.can('leave', 'create');
        if (path.includes('files')) return access.isAdmin;
        if (path.includes('activity-log')) return access.can('activityLog', 'read');
        if (path.includes('settings')) {
          return access.can('user', 'manage-permissions') || access.can('template', 'read');
        }
        if (path.includes('lookup')) return access.isDev;
        if (path.includes('ui')) return access.isDev;
        return false;
      });

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
  const accessibleMenuConfig = useMemo(
    () => filterMenuForAccess(menuConfig, isProjectSidebar, access),
    [access, isProjectSidebar, menuConfig]
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
          return <Separator key={key} className="my-2.5 bg-white/15" />;

        default:
          return null;
      }
    });
  }, [accessibleMenuConfig]);

  return <div className="flex flex-col h-full min-w-60 mt-2.5">{renderedMenu}</div>;
};

export default memo(SidebarBuilder);
