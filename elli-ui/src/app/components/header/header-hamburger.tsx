import { PanelRight } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { useLayout } from '@app/hooks/use-layout';

const HeaderHamburger = ({ children }: { children?: React.ReactNode }) => {
  const { isMobile, sidebarToggle } = useLayout();
  return (
    <div className="flex flex-row items-center flex-wrap gap-1 mb-5 lg:mb-0 px-4 pt-3.5 lg:pt-0 lg:px-0">
      {!isMobile && (
        <Button
          variant="ghost"
          mode="icon"
          onClick={sidebarToggle}
          className="hidden in-data-[sidebar-open=false]:inline-flex"
        >
          <PanelRight className="opacity-100" />
        </Button>
      )}
      {children}
    </div>
  );
};
export default HeaderHamburger;
