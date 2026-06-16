// import { HeaderToolbar } from '@app/components/header/header-toolbar';

import type { MenuConfig } from '@app/config/types';

import { mainSidebarMenu, projectSidebarMenu } from './sidebar';

export interface HeaderConfig {
  breadcrumbs?: boolean | React.ReactNode;
  toolbar?: React.ReactNode;
  menuConfig: MenuConfig;
}

export const mainHeaderConfig: HeaderConfig = {
  breadcrumbs: true,
  menuConfig: mainSidebarMenu,
};

// export const projectHeaderConfig: HeaderConfig = {
//   breadcrumbs: true,
//   toolbar: <HeaderToolbar />,
//   menuConfig: projectSidebarMenu,
// };

export const projectsDetailHeaderConfig: HeaderConfig = {
  breadcrumbs: true,
  menuConfig: projectSidebarMenu,
};
