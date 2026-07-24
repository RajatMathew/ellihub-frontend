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
  containerClassName = 'space-y-1 px-2.5',
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
        "h-8 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/95 hover:bg-sidebar-item-hover hover:text-sidebar-foreground data-[selected=true]:bg-sidebar-item-active data-[selected=true]:text-sidebar-foreground data-[selected=true]:before:absolute data-[selected=true]:before:left-0 data-[selected=true]:before:top-1.5 data-[selected=true]:before:bottom-1.5 data-[selected=true]:before:w-0.5 data-[selected=true]:before:rounded-r data-[selected=true]:before:bg-brand-gold data-[selected=true]:before:content-[''] [&[data-selected=true]_svg]:opacity-100",
      subTrigger:
        classNames.subTrigger ||
        'h-7 rounded-md px-3 text-[11px] font-semibold uppercase text-sidebar-muted hover:bg-sidebar-item-hover hover:text-sidebar-foreground [&_[data-slot=accordion-menu-sub-indicator]]:text-sidebar-muted',
      subContent: classNames.subContent || 'ps-2',
    }),
    [classNames]
  );

  const defaultOpenValue = menu?.find((item) => item.collapse === false) ? `${name}s` : undefined;

  return (
    <AccordionMenu
      key={pathname}
      data-sidebar-menu="group"
      selectedValue={undefined}
      matchPath={matchPath}
      type="single"
      collapsible
      defaultValue={defaultOpenValue}
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
