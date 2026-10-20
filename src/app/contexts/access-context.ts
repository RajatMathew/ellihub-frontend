import { createContext, useContext } from 'react';

import type { CurrentAccess } from '@app/api/access';

export type AccessContextValue = {
  access: CurrentAccess | undefined;
  isLoading: boolean;
  /**
   * The permission fetch failed.
   *
   * Worth distinguishing from "loaded, and you may do nothing": with no
   * permissions in hand `can()` answers `false` for everything, so a failed
   * fetch looked exactly like an account stripped of access — every action
   * gone, every guarded route forbidden, and nothing on screen saying why or
   * offering to try again.
   */
  isError: boolean;
  /** Retries the permission fetch after a failure. */
  refetch: () => void;
  isDev: boolean;
  isAdmin: boolean;
  canAccessCheckingRegister: boolean;
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
