import { useLayout } from '@app/hooks/use-layout';
import { UserDropdownMenu } from '@app/shared/topbar/user-dropdown-menu';

import { HeaderBreadcrumbs } from './header-breadcrumbs';
import HeaderHamburger from './header-hamburger';
import { HeaderMenu } from './header-menu';

interface HeaderProps {
  breadcrumbs?: boolean | React.ReactNode;
  toolbar?: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function Header({ breadcrumbs = true, toolbar, sidebar }: HeaderProps) {
  const { isMobile } = useLayout();

  return (
    <header className="flex items-stretch fixed z-10 lg:border-t transition-[left,right] duration-300 start-0  lg:in-data-[sidebar-open=false]:border-s lg:border-e border-border top-0 lg:top-(--page-margin) end-0 lg:end-(--page-margin) lg:start-(--sidebar-width) lg:in-data-[sidebar-open=false]:start-(--sidebar-collapsed-width) shrink-0 bg-background border-b backdrop-blur-sm h-(--header-height-mobile) lg:h-(--header-height) pe-(--removed-body-scroll-bar-size,0px)">
      <div className="container-fluid grow flex items-stretch justify-between gap-2.5">
        {isMobile && <HeaderMenu sidebar={sidebar} />}
        <HeaderHamburger>{!isMobile && breadcrumbs && <HeaderBreadcrumbs />}</HeaderHamburger>
        <div className="flex items-center gap-2.5">
          {toolbar && toolbar}
          <UserDropdownMenu
            trigger={
              <div className="size-10 rounded-full shrink-0 cursor-pointer bg-muted flex items-center justify-center shadow border-2">
                <div className="text-xs text-primary font-extrabold">PE</div>
              </div>
            }
          />
        </div>
      </div>
    </header>
  );
}
