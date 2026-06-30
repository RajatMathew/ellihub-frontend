import { createContext, useContext } from 'react';

import type { CurrentAccess } from '@app/api/access';

export type AccessContextValue = {
  access: CurrentAccess | undefined;
  isLoading: boolean;
  isDev: boolean;
  isAdmin: boolean;
  can: (resource: string, action: string) => boolean;
};

export const AccessContext = createContext<AccessContextValue | null>(null);

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
}
