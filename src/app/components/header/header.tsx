import { Suspense } from 'react';

import { CircleHelp, ExternalLink } from 'lucide-react';

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

  return (
    <>
      <header className="fixed start-0 end-0 top-0 z-10 flex h-(--header-height-mobile) min-w-0 shrink-0 items-stretch overflow-hidden border-b border-border bg-background pe-(--removed-body-scroll-bar-size,0px) backdrop-blur-sm transition-[left,right] duration-300 lg:top-(--page-margin) lg:start-(--sidebar-width) lg:end-(--page-margin) lg:h-(--header-height) lg:border-t lg:border-e lg:in-data-[help-open=true]:end-(--help-panel-width) lg:in-data-[sidebar-open=false]:start-(--sidebar-collapsed-width) lg:in-data-[sidebar-open=false]:border-s">
        <div className="container-fluid flex min-w-0 max-w-full grow items-stretch justify-between gap-2.5">
          {isMobile && <HeaderMenu menuConfig={menuConfig} />}
          <HeaderHamburger>{!isMobile && breadcrumbs && <HeaderBreadcrumbs />}</HeaderHamburger>
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
            {toolbar && toolbar}

            <a
              aria-label="Open Feedback"
              className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              href="https://app.notion.com/p/3821073375a78019a93fef44bafe6453?v=3821073375a78065a58a000cd1116f7c&source=copy_link"
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              Feedback
            </a>

            <Button
              aria-label={isHelpOpen ? 'Close Help Center' : 'Open Help Center'}
              aria-pressed={isHelpOpen}
              data-state={isHelpOpen ? 'open' : 'closed'}
              mode="icon"
              onClick={helpToggle}
              size="icon"
              type="button"
              variant="ghost"
            >
              <CircleHelp />
            </Button>
            <UserDropdownMenu
              trigger={
                <div className="size-8 rounded-full shrink-0 cursor-pointer bg-primary/10 flex items-center justify-center border border-primary/15">
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
