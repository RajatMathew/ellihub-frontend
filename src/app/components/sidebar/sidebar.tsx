import { ScrollArea } from "@app/components/ui/scroll-area";
import { SidebarHeader } from "./sidebar-header";

import { SidebarRoutingSetup } from "@app/routing/app-sidebar";

export default function Sidebar() {
  return (
    <div className="bg-background overflow-hidden border border-border">
      <SidebarHeader />
      <ScrollArea className="shrink-0 h-[calc(100vh-4.5rem)] lg:h-[calc(100vh-5.5rem)] mt-0 mb-2.5 min-w-60 ">
        <SidebarRoutingSetup />
      </ScrollArea>
    </div>
  );
}
