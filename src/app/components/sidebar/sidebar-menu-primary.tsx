import { useCallback } from "react";
import {
  AccordionMenu,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
} from "@app/components/ui/accordion-menu";
import { Badge } from "@app/components/ui/badge";
import type { MenuConfig } from "@app/config/types";
import { Link, useLocation } from "react-router-dom";

export function SidebarPrimaryMenu({ menu = [] }: { menu?: MenuConfig }) {
  const { pathname } = useLocation();

  // Memoize matchPath to prevent unnecessary re-renders
  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname ||
      (path.length > 1 && pathname.startsWith(path) && path !== "/app"),
    [pathname],
  );

  return (
    <AccordionMenu
      selectedValue={pathname}
      matchPath={matchPath}
      type="multiple"
      className="space-y-2.5 px-2.5 my-1"
      classNames={{
        label: "text-xs font-normal text-muted-foreground mb-2",
        item: "h-8.5 px-2.5 text-sm font-normal text-foreground hover:text-primary data-[selected=true]:bg-muted data-[selected=true]:text-foreground [&[data-selected=true]_svg]:opacity-100",
        group: "",
      }}
    >
      {menu?.map((item, index) => {
        return (
          <AccordionMenuGroup key={index}>
            {item.title && (
              <AccordionMenuLabel>{item.title}</AccordionMenuLabel>
            )}
            {item.children?.map((child, index) => {
              return (
                <AccordionMenuItem key={index} value={child.path || "#"}>
                  <Link to={child.path || "#"}>
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
                </AccordionMenuItem>
              );
            })}
          </AccordionMenuGroup>
        );
      })}
    </AccordionMenu>
  );
}
