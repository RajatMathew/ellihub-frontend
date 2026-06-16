import { Suspense } from 'react';

import { CircleHelp } from 'lucide-react';

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
      <header className="flex items-stretch fixed z-10 lg:border-t transition-[left,right] duration-300 start-0  lg:in-data-[sidebar-open=false]:border-s lg:border-e border-border top-0 lg:top-(--page-margin) end-0 lg:end-(--page-margin) lg:in-data-[help-open=true]:end-(--help-panel-width) lg:start-(--sidebar-width) lg:in-data-[sidebar-open=false]:start-(--sidebar-collapsed-width) shrink-0 bg-background border-b backdrop-blur-sm h-(--header-height-mobile) lg:h-(--header-height) pe-(--removed-body-scroll-bar-size,0px)">
        <div className="container-fluid grow flex items-stretch justify-between gap-2.5">
          {isMobile && <HeaderMenu menuConfig={menuConfig} />}
          <HeaderHamburger>{!isMobile && breadcrumbs && <HeaderBreadcrumbs />}</HeaderHamburger>
          <div className="flex items-center gap-2.5">
            {toolbar && toolbar}
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
        <aside className="dark fixed overflow-hidden top-(--page-margin) bottom-(--page-margin) start-0 z-20 transition-all duration-300 flex items-stretch shrink-0 w-(--sidebar-width) in-data-[sidebar-open=false]:w-(--sidebar-collapsed-width)">
          <Suspense fallback={null}>
            <Sidebar menuConfig={menuConfig} mode={sidebarMode} />
          </Suspense>
        </aside>
      )}
    </>
  );
}
