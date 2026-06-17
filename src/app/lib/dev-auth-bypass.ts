/**
 * Local dev-only auth bypass.
 *
 * When VITE_DEV_AUTH_BYPASS is enabled (and we are running the Vite dev
 * server), the app pretends a full-access "dev" user is signed in. This lets
 * us work on the UI without a backend login. It is gated on import.meta.env.DEV
 * so it can never affect a production build.
 *
 * NOTE: data queries still hit the real backend through the Vite proxy, so
 * lists may return 401/empty without a real session cookie. This bypass is for
 * reaching and editing the app shell / screen layouts, not for live data.
 */
import type { CurrentAccess } from '@app/api/access';

const enabledValues = new Set(['1', 'true', 'yes', 'on']);

export const DEV_AUTH_BYPASS =
  import.meta.env.DEV &&
  enabledValues.has((import.meta.env.VITE_DEV_AUTH_BYPASS ?? '').trim().toLowerCase());

const now = new Date();

export const DEV_SESSION = {
  user: {
    id: 'dev-user',
    name: 'Dev User',
    email: 'dev@ellicorp.com',
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  },
  session: {
    id: 'dev-session',
    userId: 'dev-user',
    token: 'dev-bypass-token',
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365),
    createdAt: now,
    updatedAt: now,
  },
};

// Grant every action on every resource so nothing in the sidebar/UI is gated off.
const ALL_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'sync',
  'manage',
  'export',
  'approve',
] as const;

export const DEV_ACCESS: CurrentAccess = {
  userId: 'dev-user',
  role: 'dev',
  isDev: true,
  isAdmin: true,
  employeeId: null,
  projectScope: 'all',
  permissions: new Proxy(
    {},
    {
      get: () => ALL_ACTIONS,
    }
  ) as CurrentAccess['permissions'],
};
