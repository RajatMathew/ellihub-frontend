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

function filterMenuForUser(menuConfig: MenuConfig, isProjectSidebar: boolean): MenuConfig {
  if (isProjectSidebar) return menuConfig;

  const filtered = menuConfig
    .map((item) => {
      if (!item.children) return null;

      const children = item.children.filter((child) => {
        const path = child.path ?? '';
        return (
          path.includes('projects') ||
          path.includes('hr/pto') ||
          path.includes('directory/contacts') ||
          path.includes('directory/general-contractors') ||
          path.includes('directory/vendors')
        );
      });

      if (children.length === 0) return null;
      return { ...item, children };
    })
    .filter(Boolean) as MenuConfig;

  return compactSeparators(filtered);
}

const SidebarBuilder = ({ menuConfig }: Props) => {
  const { isAdmin } = useAccess();
  const location = useLocation();
  const isProjectSidebar = location.pathname.includes('/app/project/');
  const accessibleMenuConfig = useMemo(
    () => (isAdmin ? menuConfig : filterMenuForUser(menuConfig, isProjectSidebar)),
    [isAdmin, isProjectSidebar, menuConfig]
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
          return <Separator key={key} className="my-2.5" />;

        default:
          return null;
      }
    });
  }, [accessibleMenuConfig]);

  return <div className="flex flex-col h-full min-w-60 mt-2.5">{renderedMenu}</div>;
};

export default memo(SidebarBuilder);
