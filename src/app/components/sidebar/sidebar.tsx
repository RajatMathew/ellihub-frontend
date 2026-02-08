import { ScrollArea } from '@app/components/ui/scroll-area';
import { SidebarRoutingSetup } from '@app/routing/setup';

import { SidebarHeader } from './sidebar-header';

export default function Sidebar() {
  return (
    <div className="bg-background overflow-hidden border border-border">
      <SidebarHeader />
      <ScrollArea className="shrink-0 h-[calc(100vh-6rem)] lg:h-[calc(100vh-7rem)] mt-0 mb-2.5 min-w-60 ">
        <SidebarRoutingSetup />
      </ScrollArea>
      <footer className="shrink-0 px-3 py-2 border-t border-border">
        <span className="text-muted-foreground text-[7pt] font-mono text-center block">
          {__APP_VERSION__}
        </span>
      </footer>
    </div>
  );
}
