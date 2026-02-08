import { Button } from "@app/components/ui/button";
import { useLayout } from "@app/hooks/use-layout";
import { PanelRight } from "lucide-react";
import { SidebarLogo } from "./sidebar-logo";

export function SidebarHeader() {
  const { sidebarToggle } = useLayout();

  return (
    <div className="flex border-b border-border items-center gap-2 h-[calc(var(--header-height)-1px)]">
      <div className="flex items-center w-full">
        {/* Sidebar header */}
        <div className="flex w-full grow items-center justify-between px-5 gap-2.5">
          <>
            <SidebarLogo />
          </>
          {/* Sidebar toggle */}
          <Button
            mode="icon"
            variant="ghost"
            onClick={sidebarToggle}
            className="hidden lg:inline-flex text-muted-foreground hover:text-foreground"
          >
            <PanelRight className="opacity-100" />
          </Button>
        </div>
      </div>
    </div>
  );
}
