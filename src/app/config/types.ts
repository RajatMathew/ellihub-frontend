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
  rootPath?: string;
  childrenIndex?: number;
  heading?: string;
  children?: MenuConfig;
  disabled?: boolean;
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
