import { Suspense, useState } from 'react';

import { MarkFeedbackDialog } from '@/modules/feedback/components/mark-feedback-dialog';
import { LifeBuoy, MessageSquareQuote } from 'lucide-react';

import { useSession } from '@app/api/auth-client';
import { Button } from '@app/components/ui/button';
import type { MenuConfig } from '@app/config/types';
import { useLayout } from '@app/hooks/use-layout';
import { UserDropdownMenu } from '@app/shared/topbar/user-dropdown-menu';

import Sidebar from '../sidebar/sidebar';
import type { SidebarMode } from '../sidebar/sidebar-animated-content';
import { HeaderBreadcrumbs } from './header-breadcrumbs';
import HeaderHamburger from './header-hamburger';
import { HeaderMenu } from './header-menu';

interface HeaderProps {
  breadcrumbs?: boolean | React.ReactNode;
  toolbar?: React.ReactNode;
  menuConfig: MenuConfig;
  sidebarMode?: SidebarMode;
}

export function Header({
  breadcrumbs = true,
  toolbar,
  menuConfig,
  sidebarMode = 'main',
}: HeaderProps) {
  const { helpToggle, isHelpOpen, isMobile } = useLayout();
  const { data } = useSession();
  const [markFeedbackOpen, setMarkFeedbackOpen] = useState(false);

  return (
    <>
      <header className="fixed start-0 end-0 top-0 z-10 flex h-(--header-height-mobile) min-w-0 shrink-0 items-stretch overflow-hidden border-b border-page-header-border bg-page-header pe-(--removed-body-scroll-bar-size,0px) backdrop-blur-sm transition-[left,right] duration-300 lg:top-(--page-margin) lg:start-(--sidebar-width) lg:end-(--page-margin) lg:h-(--header-height) lg:border-t lg:border-e lg:in-data-[help-open=true]:end-(--help-panel-width) lg:in-data-[sidebar-open=false]:start-(--sidebar-collapsed-width) lg:in-data-[sidebar-open=false]:border-s">
        <div className="container-fluid flex min-w-0 max-w-full grow items-stretch justify-between gap-2.5">
          {isMobile && <HeaderMenu menuConfig={menuConfig} />}
          <HeaderHamburger>{!isMobile && breadcrumbs && <HeaderBreadcrumbs />}</HeaderHamburger>
          <div className="flex min-w-0 shrink-0 items-center gap-1">
            {toolbar && toolbar}

            <Button
              aria-label="Feedback"
              onClick={() => setMarkFeedbackOpen(true)}
              size={isMobile ? 'icon' : 'sm'}
              type="button"
              variant="ghost"
              className="gap-1 bg-transparent px-3 py-4 text-sm font-semibold text-primary hover:bg-(--header-action-hover-background) hover:text-primary hover:duration-100 data-[state=open]:bg-(--header-action-hover-background) focus-visible:bg-(--header-action-hover-background)"
            >
              <MessageSquareQuote className="size-4 text-current" />
              {!isMobile && <span>Feedback</span>}
            </Button>

            <Button
              aria-label={isHelpOpen ? 'Close Help Center' : 'Open Help Center'}
              aria-pressed={isHelpOpen}
              data-state={isHelpOpen ? 'open' : 'closed'}
              onClick={helpToggle}
              size={isMobile ? 'icon' : 'sm'}
              type="button"
              variant="ghost"
              className="gap-1 bg-transparent px-3 py-4 text-sm font-semibold text-primary hover:bg-(--header-action-hover-background) hover:text-primary hover:duration-100 data-[state=open]:bg-(--header-action-hover-background) focus-visible:bg-(--header-action-hover-background)"
            >
              <LifeBuoy className="size-4 text-current" />
              {!isMobile && <span>Help</span>}
            </Button>
            <UserDropdownMenu
              trigger={
                <div className="ml-2 size-8 ring-2 ring-transparent hover:ring-primary ring-offset-3 ring-offset-background hover:duration-200 rounded-full shrink-0 cursor-pointer bg-primary/10 flex items-center justify-center border border-primary/15">
                  <div className="text-[11px] text-primary font-bold">
                    {data?.user?.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || '?'}
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </header>
      <MarkFeedbackDialog open={markFeedbackOpen} onOpenChange={setMarkFeedbackOpen} />
      {!isMobile && (
        <aside
          data-slot="app-sidebar"
          className="fixed overflow-hidden top-(--page-margin) bottom-(--page-margin) start-0 z-20 transition-all duration-300 flex items-stretch shrink-0 w-(--sidebar-width) in-data-[sidebar-open=false]:w-(--sidebar-collapsed-width)"
        >
          <Suspense fallback={null}>
            <Sidebar menuConfig={menuConfig} mode={sidebarMode} />
          </Suspense>
        </aside>
      )}
    </>
  );
}
