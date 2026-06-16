import { useCallback, useMemo } from 'react';

import { Link, useLocation } from 'react-router-dom';

import {
  AccordionMenu,
  AccordionMenuIndicator,
  AccordionMenuLinkItem,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@app/components/ui/accordion-menu';
import { Badge } from '@app/components/ui/badge';
import type { MenuConfig } from '@app/config/types';
import { getSidebarResolutionBase, resolvePath } from '@app/lib/utils';

import { SidebarMenuCreateAction } from './sidebar-menu-create-action';

interface SidebarGroupMenuProps {
  /** Menu configuration array */
  menu?: MenuConfig;
  /** Unique identifier for the menu group */
  name?: string;
  /** Custom class names for styling */
  classNames?: {
    item?: string;
    subTrigger?: string;
    subContent?: string;
  };
  /** Custom container class */
  containerClassName?: string;
}

/**
 * Reusable sidebar group menu component that renders collapsible menu items
 * @param {SidebarGroupMenuProps} props - Component props
 * @returns {JSX.Element} Rendered accordion menu
 *
 * @example
 * ```tsx
 * <SidebarGroupMenu
 *   menu={menuConfig}
 *   name="main"
 *   containerClassName="space-y-4"
 * />
 * ```
 */
export function SidebarGroupMenu({
  menu,
  name = 'res',
  classNames = {},
  containerClassName = 'space-y-5 px-2.5',
}: SidebarGroupMenuProps) {
  const { pathname } = useLocation();
  const { base, stripLeadingDotDotSlash } = getSidebarResolutionBase(pathname);
  const resolveSidebarMenuPath = useCallback(
    (path?: string): string => {
      if (!path) return '#';
      const toResolve =
        stripLeadingDotDotSlash && path.startsWith('../') && !path.startsWith('../../')
          ? path.slice(3)
          : path;
      return resolvePath(base, toResolve);
    },
    [base, stripLeadingDotDotSlash]
  );

  // Resolve relative menu paths (e.g. "../overview") to absolute for comparison with pathname
  const matchPath = useCallback(
    (path: string): boolean => {
      const toResolve =
        stripLeadingDotDotSlash && path.startsWith('../') && !path.startsWith('../../')
          ? path.slice(3)
          : path;
      const resolved = resolvePath(base, toResolve);
      return (
        pathname === resolved ||
        (resolved.length > 1 && pathname.startsWith(resolved) && resolved !== '/app')
      );
    },
    [pathname, base, stripLeadingDotDotSlash]
  );

  const defaultClassNames = useMemo(
    () => ({
      item:
        classNames.item ||
        'h-8 px-2.5 text-sm font-normal text-foreground hover:text-sidebar-hover-foreground data-[selected=true]:bg-[#2F2F2F] data-[selected=true]:text-foreground [&[data-selected=true]_svg]:opacity-100',
      subTrigger:
        classNames.subTrigger || 'text-xs font-normal text-muted-foreground hover:bg-transparent',
      subContent: classNames.subContent || 'ps-0',
    }),
    [classNames]
  );

  return (
    <AccordionMenu
      selectedValue={`${name}-trigger`}
      matchPath={matchPath}
      type="single"
      collapsible
      defaultValue={`${name}-trigger`}
      className={containerClassName}
      classNames={defaultClassNames}
    >
      {menu?.map((item, index) => (
        <AccordionMenuSub key={index} value={`${name}s`}>
          <AccordionMenuSubTrigger value={`${name}-trigger`}>
            <span>{item.title}</span>
            <AccordionMenuIndicator />
          </AccordionMenuSubTrigger>

          <AccordionMenuSubContent type="single" collapsible parentValue={`${name}-trigger`}>
            {item.children?.map((child, index) => {
              const to = resolveSidebarMenuPath(child.path);
              const createTo = child.createPath
                ? resolveSidebarMenuPath(
                    child.createPath === true
                      ? `${child.path?.replace(/\/$/, '')}/create`
                      : child.createPath
                  )
                : undefined;

              return (
                <AccordionMenuLinkItem
                  key={index}
                  value={child.path || '#'}
                  asChild
                  className={child.createPath ? 'group/sidebar-menu-item pe-1' : undefined}
                  trailing={
                    createTo ? (
                      <SidebarMenuCreateAction item={child} createPath={createTo} />
                    ) : undefined
                  }
                >
                  <Link to={to}>
                    {child.icon && <child.icon />}
                    <span>{child.title}</span>
                    {child.badge && (
                      <Badge
                        size="sm"
                        variant={child.badge.variant}
                        appearance={child.badge.appearance}
                      >
                        {child.badge.text}
                      </Badge>
                    )}
                  </Link>
                </AccordionMenuLinkItem>
              );
            })}
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      ))}
    </AccordionMenu>
  );
}
