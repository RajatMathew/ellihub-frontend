import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const baseURL =
  typeof import.meta.env.VITE_API_BASE_URL === 'string' &&
  import.meta.env.VITE_API_BASE_URL.length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : undefined;

const AUTH_BASE_PATH = 'api/v1/auth';

export const authClient = createAuthClient({
  baseURL,
  basePath: AUTH_BASE_PATH,
  fetchOptions: {
    credentials: 'include',
  },
  sessionOptions: {
    refetchInterval: 0,
    refetchOnWindowFocus: false,
    refetchWhenOffline: false,
  },
  plugins: [magicLinkClient()],
});

/**
 * The absolute URL of an auth endpoint, for the few the browser must open
 * itself rather than fetch — a navigation lets the API set its cookie and
 * redirect back, as social sign-in does.
 */
export function getAuthEndpointUrl(path: string): URL {
  const origin = (baseURL ?? window.location.origin).replace(/\/+$/, '');
  return new URL(`${origin}/${AUTH_BASE_PATH}${path}`);
}

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  requestPasswordReset,
  resetPassword,
  changePassword,
} = authClient;
