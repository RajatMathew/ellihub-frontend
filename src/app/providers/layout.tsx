import { useEffect, useState, type ReactNode } from 'react';

import { TooltipProvider } from '@app/components/ui/tooltip';
import { LayoutContext } from '@app/contexts/layout';
import { useIsMobile } from '@app/hooks/use-mobile';

const PAGE_MARGIN = '0';
const HEADER_HEIGHT = '60px';
const SIDEBAR_WIDTH = '240px';
const SIDEBAR_COLLAPSED_WIDTH = '0px';
const TOOLBAR_HEIGHT = '54px';
const HELP_PANEL_WIDTH = '520px';

// Provider component
interface LayoutProviderProps {
  children: ReactNode;
  style?: React.CSSProperties;
  bodyClassName?: string;
}

export function LayoutProvider({
  children,
  style: customStyle,
  bodyClassName = '',
}: LayoutProviderProps) {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isHelpOpen, setHelpOpen] = useState(false);

  const defaultStyle: React.CSSProperties = {
    '--page-margin': PAGE_MARGIN,
    '--sidebar-width': SIDEBAR_WIDTH,
    '--sidebar-collapsed-width': SIDEBAR_COLLAPSED_WIDTH,
    '--header-height': HEADER_HEIGHT,
    '--toolbar-height': TOOLBAR_HEIGHT,
    '--help-panel-width': HELP_PANEL_WIDTH,
  } as React.CSSProperties;

  const style: React.CSSProperties = {
    ...defaultStyle,
    ...customStyle,
  };

  // Sidebar toggle function
  const sidebarToggle = () => setIsSidebarOpen((open) => !open);
  const helpToggle = () => setHelpOpen((open) => !open);

  // Set body className on mount and clean up on unmount
  useEffect(() => {
    if (bodyClassName) {
      const body = document.body;
      const existingClasses = body.className;

      // Add new classes
      body.className = `${existingClasses} ${bodyClassName}`.trim();

      // Cleanup function to remove classes on unmount
      return () => {
        body.className = existingClasses;
      };
    }
  }, [bodyClassName]);

  return (
    <LayoutContext.Provider
      value={{
        bodyClassName,
        style,
        isMobile,
        isSidebarOpen,
        isHelpOpen,
        sidebarToggle,
        helpToggle,
        setHelpOpen,
      }}
    >
      <div
        data-slot="layout-wrapper"
        className="flex grow"
        data-help-open={isHelpOpen}
        data-sidebar-open={isSidebarOpen}
        style={style}
      >
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </div>
    </LayoutContext.Provider>
  );
}
