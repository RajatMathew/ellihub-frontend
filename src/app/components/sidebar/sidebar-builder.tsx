import { memo, useMemo } from 'react';

import { useProjectDetailQuery } from '@/modules/project/hooks';
import { useLocation } from 'react-router-dom';

import type { MenuConfig } from '@app/config/types';
import { useAccess } from '@app/contexts/access-context';

import { Separator } from '../ui/separator';
import { filterMenuForAccess } from './sidebar-access';
import SidebarCustomMenu from './sidebar-menu-custom';
import { SidebarGroupMenu } from './sidebar-menu-group';
import { SidebarPrimaryMenu } from './sidebar-menu-primary';

type Props = {
  menuConfig: MenuConfig;
};

function getProjectIdFromPath(pathname: string): string {
  return pathname.match(/^\/app\/project\/([^/]+)/)?.[1] ?? '';
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
