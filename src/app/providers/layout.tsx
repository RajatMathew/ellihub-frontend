import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { TooltipProvider } from '@app/components/ui/tooltip';
import { LayoutContext } from '@app/contexts/layout';
import { useIsMobile } from '@app/hooks/use-mobile';

const PAGE_MARGIN = '0';
const HEADER_HEIGHT = '60px';
const SIDEBAR_WIDTH = '240px';
const SIDEBAR_COLLAPSED_WIDTH = '0px';
const TOOLBAR_HEIGHT = '54px';
const HELP_PANEL_WIDTH = '520px';

/**
 * What the shell measures out to while a route holds the whole viewport.
 *
 * The header and the sidebar are `position: fixed` and sized entirely from
 * these variables, and the routed content offsets itself by the same ones — so
 * zeroing them is all it takes to collapse the chrome. Nothing is unmounted:
 * the header keeps its `overflow-hidden`, so at zero height it simply has no
 * box, and releasing the claim restores it without a remount.
 */
const HIDDEN_CHROME_STYLE: React.CSSProperties = {
  '--header-height': '0px',
  '--header-height-mobile': '0px',
  '--sidebar-width': '0px',
  '--sidebar-collapsed-width': '0px',
} as React.CSSProperties;

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
  // Counted rather than boolean: during a route transition the incoming page
  // can mount before the outgoing one unmounts, and a plain flag would let the
  // outgoing unmount hand the chrome back underneath the new page.
  const [chromeClaims, setChromeClaims] = useState(0);
  const isChromeHidden = chromeClaims > 0;

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
    ...(isChromeHidden ? HIDDEN_CHROME_STYLE : null),
  };

  // Sidebar toggle function
  const sidebarToggle = () => setIsSidebarOpen((open) => !open);
  const helpToggle = () => setHelpOpen((open) => !open);
  const setChromeHidden = useCallback((hidden: boolean) => {
    setChromeClaims((claims) => Math.max(0, claims + (hidden ? 1 : -1)));
  }, []);

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

  const value = useMemo(
    () => ({
      bodyClassName,
      style,
      isMobile,
      isSidebarOpen,
      isHelpOpen,
      isChromeHidden,
      sidebarToggle,
      helpToggle,
      setHelpOpen,
      setChromeHidden,
    }),
    // `style` is rebuilt every render from primitives that are all in this
    // list, so spreading it here would only ever churn the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bodyClassName, isMobile, isSidebarOpen, isHelpOpen, isChromeHidden, setChromeHidden]
  );

  return (
    <LayoutContext.Provider value={value}>
      <div
        data-slot="layout-wrapper"
        className="flex w-full max-w-full min-w-0 grow"
        data-help-open={isHelpOpen}
        data-sidebar-open={isSidebarOpen}
        data-chrome-hidden={isChromeHidden}
        style={style}
      >
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </div>
    </LayoutContext.Provider>
  );
}
