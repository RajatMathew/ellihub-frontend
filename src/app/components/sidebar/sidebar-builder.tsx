import { memo, useMemo } from "react";
import type { MenuConfig } from "@app/config/types";
import { SidebarGroupMenu } from "./sidebar-menu-group";
import { SidebarPrimaryMenu } from "./sidebar-menu-primary";
import { Separator } from "../ui/separator";
import SidebarCustomMenu from "./sidebar-menu-custom";

type Props = {
  menuConfig: MenuConfig;
};

const SidebarBuilder = ({ menuConfig }: Props) => {
  const renderedMenu = useMemo(() => {
    return menuConfig.map((group, index) => {
      const key = `${group.type}-${group.title ?? ""}-${index}`;

      switch (group.type) {
        case "group":
        case "group-collapsed":
          return <SidebarGroupMenu key={key} menu={[group]} name={key} />;

        case "menu":
          return <SidebarPrimaryMenu key={key} menu={[group]} />;

        case "custom":
          return <SidebarCustomMenu key={key} menu={[group]} />;

        case "separator":
          return <Separator key={key} className="my-2.5" />;

        default:
          return null;
      }
    });
  }, [menuConfig]);

  return (
    <div className="flex flex-col h-full min-w-60 mt-2.5">{renderedMenu}</div>
  );
};

export default memo(SidebarBuilder);
