import { createContext } from 'react';

// Define the shape of the layout stateß
interface LayoutState {
  style: React.CSSProperties;
  bodyClassName: string;
  isMobile: boolean;
  isSidebarOpen: boolean;
  isHelpOpen: boolean;
  sidebarToggle: () => void;
  helpToggle: () => void;
  setHelpOpen: (open: boolean) => void;
}

// Create the context
export const LayoutContext = createContext<LayoutState | undefined>(undefined);
