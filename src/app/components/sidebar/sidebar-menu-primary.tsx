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
      selectedValue={pathname}
      matchPath={matchPath}
      type="multiple"
      className="space-y-1 px-2.5 my-0"
      classNames={{
        label: 'text-xs font-normal text-muted-foreground mb-1',
        item: 'h-8 px-2.5 text-[13px] font-medium text-foreground hover:!bg-white/10 hover:!text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-foreground [&[data-selected=true]_svg]:opacity-100',
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
          </AccordionMenuGroup>
        );
      })}
    </AccordionMenu>
  );
}
