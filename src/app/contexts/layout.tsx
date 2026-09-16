import { createContext } from 'react';

// Define the shape of the layout stateß
interface LayoutState {
  style: React.CSSProperties;
  bodyClassName: string;
  isMobile: boolean;
  isSidebarOpen: boolean;
  isHelpOpen: boolean;
  /**
   * A route is asking for the whole viewport — no app header, no nav sidebar.
   * The mailbox is the only caller (elli-ui#921): it is a full application in
   * its own right and the design it was redrawn to has no room for the shell.
   */
  isChromeHidden: boolean;
  sidebarToggle: () => void;
  helpToggle: () => void;
  setHelpOpen: (open: boolean) => void;
  /**
   * Claims (true) or releases (false) the full viewport. Claims are counted,
   * so two mounted claimants cannot have the first one to unmount hand the
   * chrome back while the second is still drawn full-bleed.
   */
  setChromeHidden: (hidden: boolean) => void;
}

// Create the context
export const LayoutContext = createContext<LayoutState | undefined>(undefined);
