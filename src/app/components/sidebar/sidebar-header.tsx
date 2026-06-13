import { PanelRight } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { useLayout } from '@app/hooks/use-layout';

import { SidebarLogo } from './sidebar-logo';

export function SidebarHeader() {
  const { sidebarToggle } = useLayout();

  return (
    <div className="mb-1 mt-1 flex h-[calc(var(--header-height)-1px)] items-center">
      <div className="flex w-full grow items-center justify-between gap-2.5 px-2.5">
        <SidebarLogo />
        <Button
          aria-label="Collapse sidebar"
          mode="icon"
          size="md"
          variant="ghost"
          onClick={sidebarToggle}
          className="text-muted-foreground hover:text-foreground"
        >
          <PanelRight className="opacity-100" />
        </Button>
      </div>
    </div>
  );
}
