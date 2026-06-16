import { createAuthClient } from 'better-auth/react';

import { DEV_AUTH_BYPASS, DEV_SESSION } from '@app/lib/dev-auth-bypass';

const baseURL =
  typeof import.meta.env.VITE_API_BASE_URL === 'string' &&
  import.meta.env.VITE_API_BASE_URL.length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : undefined;

export const authClient = createAuthClient({
  baseURL,
  basePath: 'api/v1/auth',
  fetchOptions: {
    credentials: 'include',
  },
});

export const {
  signIn,
  signUp,
  signOut,
  requestPasswordReset,
  resetPassword,
  changePassword,
} = authClient;

// Dev-only: short-circuit the session so the app treats us as signed in.
// In production builds DEV_AUTH_BYPASS is always false, so the real hooks run.
export const useSession: typeof authClient.useSession = DEV_AUTH_BYPASS
  ? ((() => ({
      data: DEV_SESSION,
      isPending: false,
      isRefetching: false,
      error: null,
      refetch: () => undefined,
    })) as unknown as typeof authClient.useSession)
  : authClient.useSession;

export const getSession: typeof authClient.getSession = DEV_AUTH_BYPASS
  ? ((async () => ({
      data: DEV_SESSION,
      error: null,
    })) as unknown as typeof authClient.getSession)
  : authClient.getSession;
