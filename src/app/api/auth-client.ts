import { createAuthClient } from 'better-auth/react';

const baseURL =
  typeof import.meta.env.VITE_API_BASE_URL === 'string' &&
  import.meta.env.VITE_API_BASE_URL.length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : undefined;

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
