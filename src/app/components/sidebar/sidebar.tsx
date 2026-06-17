// import { useMatch } from 'react-router-dom';

import { forceCheckForUpdate } from '@/core/pwa/usePwaUpdater';
import { Check, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { signOut, useSession } from '@app/api/auth-client';
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
  const { data: session } = useSession();
  const user = session?.user;
  async function handleCheckUpdate() {
    const hasUpdate = await forceCheckForUpdate();

    if (!hasUpdate) {
      toast(` Your app is up to date! v${__APP_VERSION__}`, {
        icon: <Check className="size-4 text-success" />,
      });
    }
  }
  return (
    <div className="bg-[#15304E] overflow-hidden border border-[#15304E]">
      <SidebarHeader />
      <ScrollArea className="shrink-0 h-[calc(100vh-6rem)] lg:h-[calc(100vh-7rem)] mt-3 mb-2.5 min-w-60 ">
        <SidebarAnimatedContent menuConfig={menuConfig} mode={mode} />
      </ScrollArea>
      <footer
        className="shrink-0 px-4 py-3 border-t border-white/10 text-[11px] leading-snug text-white/50"
        title="Double click to check for updates"
      >
        {user && (
          <div className="mb-2.5">
            <p className="text-white/85 font-medium truncate">{user.name}</p>
            <p className="mt-0.5 truncate">{user.email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            try {
              signOut();
            } catch (e) {
              console.error('Error signing out:', e);
            }
          }}
          className="flex items-center gap-1.5 mb-2 text-white/60 hover:text-white transition-colors"
        >
          <LogOut size={14} />
          <span>Log out</span>
        </button>
        <span
          className="block text-[10px] font-semibold tracking-wide"
          style={{ color: '#E0A94D' }}
          title={`Current version: v${__APP_VERSION__}. Double click to check for updates.`}
          onDoubleClick={() => {
            try {
              handleCheckUpdate();
            } catch (e) {
              console.error('Error checking for updates:', e);
            }
          }}
        >
          Powered by Claude
        </span>
      </footer>
    </div>
  );
}
