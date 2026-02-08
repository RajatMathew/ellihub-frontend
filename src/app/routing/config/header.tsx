import { HeaderToolbar } from '@app/components/header/header-toolbar';

export interface HeaderConfig {
  breadcrumbs?: boolean | React.ReactNode;
  toolbar?: React.ReactNode;
}

export const mainHeaderConfig: HeaderConfig = {
  breadcrumbs: true,
};

export const projectHeaderConfig: HeaderConfig = {
  breadcrumbs: true,
  toolbar: <HeaderToolbar />,
};
