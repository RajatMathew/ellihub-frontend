import { useLayout } from '@app/hooks/use-layout';

import { HeaderBreadcrumbs } from './header-breadcrumbs';
import HeaderHamburger from './header-hamburger';
import { HeaderMenu } from './header-menu';
import { HeaderToolbar } from './header-toolbar';

interface HeaderProps {
  breadcrumbs?: boolean | React.ReactNode;
}

export function Header({ breadcrumbs = true }: HeaderProps) {
  const { isMobile } = useLayout();

  return (
    <header className="flex items-stretch fixed z-10 lg:border-t transition-[left,right] duration-300 start-0  lg:in-data-[sidebar-open=false]:border-s lg:border-e border-border top-0 lg:top-(--page-margin) end-0 lg:end-(--page-margin) lg:start-(--sidebar-width) lg:in-data-[sidebar-open=false]:start-(--sidebar-collapsed-width) shrink-0 bg-background border-b backdrop-blur-sm h-(--header-height-mobile) lg:h-(--header-height) pe-(--removed-body-scroll-bar-size,0px)">
      <div className="container-fluid grow flex items-stretch justify-between gap-2.5">
        {isMobile && <HeaderMenu />}
        <HeaderHamburger>{!isMobile && breadcrumbs && <HeaderBreadcrumbs />}</HeaderHamburger>
        <div className="flex items-center gap-2.5">
          <HeaderToolbar />
        </div>
      </div>
    </header>
  );
}
