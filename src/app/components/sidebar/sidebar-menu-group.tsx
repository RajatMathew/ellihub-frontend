import { useCallback, useMemo } from 'react';

import { ArrowUpRight } from 'lucide-react';
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
  containerClassName = 'w-full min-w-0 space-y-1 px-2.5',
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
        "min-h-8 w-full min-w-0 max-w-full overflow-hidden rounded-md px-2 text-[13px] font-medium text-sidebar-foreground/95 hover:bg-sidebar-item-hover hover:text-sidebar-foreground data-[selected=true]:bg-sidebar-item-active data-[selected=true]:text-sidebar-foreground data-[selected=true]:before:absolute data-[selected=true]:before:left-0 data-[selected=true]:before:top-1.5 data-[selected=true]:before:bottom-1.5 data-[selected=true]:before:w-0.5 data-[selected=true]:before:rounded-r data-[selected=true]:before:bg-brand-gold data-[selected=true]:before:content-[''] [&>a]:min-w-0 [&>a]:max-w-full [&>a]:overflow-hidden [&_[data-slot=email-alias-label]]:whitespace-nowrap [&[data-selected=true]_svg]:opacity-100",
      subTrigger:
        classNames.subTrigger ||
        'h-7 w-full min-w-0 max-w-full overflow-hidden rounded-md px-3 text-[11px] font-semibold uppercase text-sidebar-muted hover:bg-sidebar-item-hover hover:text-sidebar-foreground [&_[data-slot=accordion-menu-sub-indicator]]:text-sidebar-muted',
      subContent:
        classNames.subContent ||
        'min-w-0 max-w-full overflow-hidden ps-0! [&_[data-slot=accordion-menu-sub-wrapper]]:min-w-0 [&_[data-slot=accordion-menu-sub-wrapper]]:max-w-full [&_[data-slot=accordion-menu-sub-wrapper]>div]:w-full [&_[data-slot=accordion-menu-sub-wrapper]>div]:min-w-0 [&_[data-slot=accordion-menu-sub-wrapper]>div]:max-w-full [&_[data-slot=accordion-menu-sub-wrapper]>div]:overflow-hidden',
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
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <AccordionMenuIndicator />
          </AccordionMenuSubTrigger>

          <AccordionMenuSubContent type="single" collapsible parentValue={`${name}-trigger`}>
            {item.children?.map((child, index) => {
              if (child.type === 'separator') {
                return (
                  <div
                    key={index}
                    role="separator"
                    className="mx-2 my-1 h-px shrink-0 bg-sidebar-border"
                  />
                );
              }

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
                  className={
                    child.disabled
                      ? 'pointer-events-none cursor-not-allowed opacity-50'
                      : child.createPath
                        ? 'group/sidebar-menu-item gap-1! pe-1!'
                        : undefined
                  }
                  trailing={
                    createTo ? (
                      <SidebarMenuCreateAction item={child} createPath={createTo} />
                    ) : undefined
                  }
                >
                  {child.external ? (
                    <a href={child.path} target="_blank" rel="noopener noreferrer">
                      {child.icon && <child.icon />}
                      {child.render ? (
                        child.render()
                      ) : (
                        <span className="min-w-0 flex-1 break-words whitespace-normal">
                          {child.title}
                        </span>
                      )}
                      {child.badge && (
                        <Badge
                          size="sm"
                          variant={child.badge.variant}
                          appearance={child.badge.appearance}
                        >
                          {child.badge.text}
                        </Badge>
                      )}
                      <ArrowUpRight
                        data-slot="sidebar-external-indicator"
                        className="ms-auto shrink-0"
                        aria-hidden="true"
                      />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link
                      to={child.disabled ? '#' : to}
                      aria-disabled={child.disabled}
                      tabIndex={child.disabled ? -1 : undefined}
                    >
                      {child.icon && <child.icon />}
                      {child.render ? (
                        child.render()
                      ) : (
                        <span className="min-w-0 flex-1 break-words whitespace-normal">
                          {child.title}
                        </span>
                      )}
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
                  )}
                </AccordionMenuLinkItem>
              );
            })}
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      ))}
    </AccordionMenu>
  );
}
