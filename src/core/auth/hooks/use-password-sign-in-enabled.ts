import { getAuthCapabilities } from '@/core/auth/api/auth-methods.api';
import { authKeys } from '@/core/auth/constants/auth.keys';
import { isPasswordSignInEnabled } from '@/core/auth/lib/password-sign-in';
import { useQuery } from '@tanstack/react-query';

/**
 * Whether password sign-in is on, for forms inside the app that would set a
 * password. It is a deployment setting, so it is fetched once and kept. Until
 * it is known, or if it cannot be, it counts as on - the server refuses a
 * password anyway while it is off.
 */
export function usePasswordSignInEnabled(): boolean {
  const query = useQuery({
    queryKey: authKeys.capabilities(),
    queryFn: getAuthCapabilities,
    staleTime: 30 * 60_000,
  });
  return isPasswordSignInEnabled(query.data);
}
