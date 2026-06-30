import type { JSX } from 'react';

import { type LucideIcon } from 'lucide-react';

import type { BadgeProps } from '@app/components/ui/badge';

export interface MenuItem {
  type?: 'custom' | 'group' | 'group-collapsed' | 'menu' | 'separator';
  title?: string;
  desc?: string;
  img?: string;
  icon?: LucideIcon;
  path?: string;
  createPath?: string | true;
  createTitle?: string;
  access?: MenuAccessRule;
  createAccess?: MenuAccessRule;
  projectAction?: MenuProjectActionRule;
  createProjectAction?: MenuProjectActionRule;
  rootPath?: string;
  childrenIndex?: number;
  heading?: string;
  children?: MenuConfig;
  disabled?: boolean;
  /** For sidebar groups: set false to open the group by default. */
  collapse?: boolean;
  collapseTitle?: string;
  expandTitle?: string;
  badge?: {
    text: string;
    variant?: BadgeProps['variant'];
    appearance?: BadgeProps['appearance'];
  };
  separator?: boolean;
  render?: () => JSX.Element;
}

export type MenuConfig = MenuItem[];

export interface MenuAccessRule {
  resource: string;
  action: string;
}

export interface MenuProjectActionRule {
  resource:
    | 'projectTeam'
    | 'projectSchedule'
    | 'primeContract'
    | 'rfq'
    | 'purchaseOrder'
    | 'subChangeOrder'
    | 'invoice';
  action: string;
}
