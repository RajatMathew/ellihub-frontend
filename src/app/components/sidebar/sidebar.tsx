// import { useMatch } from 'react-router-dom';

import { forceCheckForUpdate } from '@/core/pwa/usePwaUpdater';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { ScrollArea } from '@app/components/ui/scroll-area';
import type { MenuConfig } from '@app/config/types';

import { SidebarAnimatedContent, type SidebarMode } from './sidebar-animated-content';
import { SidebarHeader } from './sidebar-header';

export default function Sidebar({
  menuConfig,
  mode = 'main',
}: {
  menuConfig: MenuConfig;
  mode?: SidebarMode;
}) {
  // const matches = useMatch('/app/*');
  // console.log('Sidebar match:', matches);
  async function handleCheckUpdate() {
    const hasUpdate = await forceCheckForUpdate();

    if (!hasUpdate) {
      toast(` Your app is up to date! v${__APP_VERSION__}`, {
        icon: <Check className="size-4 text-success" />,
      });
    }
  }
  return (
    <div className="flex h-full min-h-0 min-w-60 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-bg">
      <SidebarHeader />
      <ScrollArea className="mt-0 min-h-0 min-w-60 flex-1">
        <SidebarAnimatedContent menuConfig={menuConfig} mode={mode} />
      </ScrollArea>
      <footer
        className="shrink-0 border-t border-sidebar-border px-3 py-2"
        title="Double click to check for updates"
      >
        <span
          className="text-sidebar-muted text-[7pt] font-mono text-center block"
          title={`Current version: v${__APP_VERSION__}. Double click to check for updates.`}
          onDoubleClick={() => {
            try {
              handleCheckUpdate();
            } catch (e) {
              console.error('Error checking for updates:', e);
            }
          }}
        >
          {__APP_VERSION__}
        </span>
      </footer>
    </div>
  );
}
