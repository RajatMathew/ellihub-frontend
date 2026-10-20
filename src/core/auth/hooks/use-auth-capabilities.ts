import { useCallback, useEffect, useState } from 'react';

import { getAuthCapabilities, type AuthCapabilities } from '@/core/auth/api/auth-methods.api';

export type AuthCapabilitiesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; capabilities: AuthCapabilities };

/**
 * Which sign-in methods and providers the API has switched on, fetched once
 * for the sign-in page. The auth routes sit outside the query client, hence
 * the effect.
 */
export function useAuthCapabilities() {
  const [state, setState] = useState<AuthCapabilitiesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void getAuthCapabilities()
      .then((capabilities) => {
        if (!cancelled) setState({ status: 'loaded', capabilities });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
