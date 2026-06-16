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
    <div className="bg-[#191919] overflow-hidden border border-border">
      <SidebarHeader />
      <ScrollArea className="shrink-0 h-[calc(100vh-6rem)] lg:h-[calc(100vh-7rem)] mt-0 mb-2.5 min-w-60 ">
        <SidebarAnimatedContent menuConfig={menuConfig} mode={mode} />
      </ScrollArea>
      <footer
        className="shrink-0 px-3 py-2 border-t border-border"
        title="Double click to check for updates"
      >
        <span
          className="text-muted-foreground text-[7pt] font-mono text-center block"
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
