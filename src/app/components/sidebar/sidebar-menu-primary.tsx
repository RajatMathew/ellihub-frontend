import { useCallback } from 'react';

import { Link, useLocation } from 'react-router-dom';

import {
  AccordionMenu,
  AccordionMenuGroup,
  AccordionMenuLabel,
  AccordionMenuLinkItem,
} from '@app/components/ui/accordion-menu';
import { Badge } from '@app/components/ui/badge';
import type { MenuConfig } from '@app/config/types';
import { getSidebarResolutionBase, resolvePath } from '@app/lib/utils';

import { SidebarMenuCreateAction } from './sidebar-menu-create-action';

export function SidebarPrimaryMenu({ menu = [] }: { menu?: MenuConfig }) {
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

  // Resolve relative menu paths (e.g. "../projects") to absolute for comparison with pathname
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

  return (
    <AccordionMenu
      data-sidebar-menu="primary"
      selectedValue={pathname}
      matchPath={matchPath}
      type="multiple"
      className="my-0 space-y-0.5 px-2.5"
      classNames={{
        label: 'text-xs font-normal text-sidebar-muted mb-1',
        item: "h-8 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/95 hover:bg-sidebar-item-hover hover:text-sidebar-foreground data-[selected=true]:bg-sidebar-item-active data-[selected=true]:text-sidebar-foreground data-[selected=true]:before:absolute data-[selected=true]:before:left-0 data-[selected=true]:before:top-1.5 data-[selected=true]:before:bottom-1.5 data-[selected=true]:before:w-0.5 data-[selected=true]:before:rounded-r data-[selected=true]:before:bg-brand-gold data-[selected=true]:before:content-[''] [&[data-selected=true]_svg]:opacity-100",
        group: '',
      }}
    >
      {menu?.map((item, index) => {
        return (
          <AccordionMenuGroup key={index}>
            {item.title && <AccordionMenuLabel>{item.title}</AccordionMenuLabel>}
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
                    <span className="min-w-0 flex-1 truncate">{child.title}</span>
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
          </AccordionMenuGroup>
        );
      })}
    </AccordionMenu>
  );
}
