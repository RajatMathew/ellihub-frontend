import { PanelRight } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { useLayout } from '@app/hooks/use-layout';

const HeaderHamburger = ({ children }: { children?: React.ReactNode }) => {
  const { isMobile, sidebarToggle } = useLayout();

  if (isMobile) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
      <Button
        variant="ghost"
        mode="icon"
        onClick={sidebarToggle}
        className="hidden in-data-[sidebar-open=false]:inline-flex"
      >
        <PanelRight className="opacity-100" />
      </Button>
      {children}
    </div>
  );
};
export default HeaderHamburger;
