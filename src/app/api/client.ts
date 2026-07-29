import { openPwaUpdateModal } from '@/core/pwa/pwaEvents';
import { forceCheckForUpdate, forceUpdateApp } from '@/core/pwa/usePwaUpdater';
import axios, { type AxiosError } from 'axios';

import { getApiErrorCode, shouldRedirectToSignIn } from './api-error-code';

export const APP_VERSION = __APP_VERSION__;

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  timeout: 30_000,
  withCredentials: true,
});

let forceUpdating = false;
let redirectingToSignIn = false;

function redirectToSignIn() {
  if (redirectingToSignIn || typeof window === 'undefined') return;

  const { pathname, search, hash } = window.location;
  if (pathname === '/sign-in') return;

  redirectingToSignIn = true;
  const next = `${pathname}${search}${hash}`;
  const redirectPath = next === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`;

  window.location.assign(redirectPath);
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    config.headers['x-app-version'] = APP_VERSION;

    // Optional
    config.headers['x-platform'] = 'pwa';

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<unknown>) => {
    // Unpack blob error if present
    if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
      try {
        const text = await error.response.data.text();
        error.response.data = JSON.parse(text);
      } catch {
        // ignore parsing error
      }
    }

    const status = error.response?.status;
    const code = getApiErrorCode(error.response?.data);

    // Force update handling
    if (status === 426 || code === 'APP_UPDATE_REQUIRED') {
      if (forceUpdating) {
        return Promise.reject(error);
      }

      forceUpdating = true;

      try {
        // Check if new SW already exists
        const hasUpdate = await forceCheckForUpdate();

        if (hasUpdate) {
          openPwaUpdateModal();
        } else {
          // Fallback hard reload
          await forceUpdateApp();
        }
      } catch (updateError) {
        console.error('Force update failed:', updateError);

        // Final fallback
        window.location.reload();
      } finally {
        forceUpdating = false;
      }
    }
    if (shouldRedirectToSignIn(status, error.response?.data)) {
      redirectToSignIn();
    }

    return Promise.reject(error);
  }
);

export default api;

export async function debugForceUpdate() {
  const fakeError = {
    response: {
      status: 426,
      data: {
        code: 'APP_UPDATE_REQUIRED',
      },
    },
  };

  const responseInterceptors = api.interceptors.response as unknown as {
    handlers?: Array<{ rejected?: (error: unknown) => Promise<unknown> }>;
  };
  const rejectedHandler = responseInterceptors.handlers?.[0]?.rejected;

  if (rejectedHandler) {
    await rejectedHandler(fakeError);
  }
}
