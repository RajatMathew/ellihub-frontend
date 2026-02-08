import { createContext } from 'react';

// Define the shape of the layout stateß
interface LayoutState {
  style: React.CSSProperties;
  bodyClassName: string;
  isMobile: boolean;
  isSidebarOpen: boolean;
  sidebarToggle: () => void;
}

// Create the context
export const LayoutContext = createContext<LayoutState | undefined>(undefined);
