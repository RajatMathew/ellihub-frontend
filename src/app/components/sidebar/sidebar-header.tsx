import { PanelRight } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { useLayout } from '@app/hooks/use-layout';

import { SidebarLogo } from './sidebar-logo';

export function SidebarHeader() {
  const { sidebarToggle } = useLayout();

  return (
    <div className="mb-1 mt-1 flex h-[calc(var(--header-height)-1px)] w-full min-w-0 items-center">
      <div className="flex w-full min-w-0 grow items-center justify-between gap-2.5 px-2.5">
        <SidebarLogo className="flex-1 overflow-hidden" />
        <Button
          aria-label="Collapse sidebar"
          mode="icon"
          size="md"
          variant="ghost"
          onClick={sidebarToggle}
          className="shrink-0 text-sidebar-muted hover:bg-sidebar-item-hover hover:text-sidebar-foreground data-[state=open]:bg-sidebar-item-hover data-[state=open]:text-sidebar-foreground"
        >
          <PanelRight className="opacity-100" />
        </Button>
      </div>
    </div>
  );
}
