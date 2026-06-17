import { openPwaUpdateModal } from '@/core/pwa/pwaEvents';
import { forceCheckForUpdate, forceUpdateApp } from '@/core/pwa/usePwaUpdater';
import axios, { type AxiosError } from 'axios';

import { DEV_AUTH_BYPASS } from '@app/lib/dev-auth-bypass';
import { mockAdapter } from '@app/lib/mock/adapter';

export const APP_VERSION = __APP_VERSION__;

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  timeout: 30_000,
  withCredentials: true,
  // Dev sandbox: serve all API calls from local seed data instead of the network.
  ...(DEV_AUTH_BYPASS ? { adapter: mockAdapter } : {}),
});

let forceUpdating = false;

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

  async (error: AxiosError<any>) => {
    // Unpack blob error if present
    if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
      try {
        const text = await error.response.data.text();
        error.response.data = JSON.parse(text);
      } catch (e) {
        // ignore parsing error
      }
    }

    const status = error.response?.status;
    const code = error.response?.data?.code;

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

  const rejectedHandler = (api.interceptors.response as any).handlers[0]?.rejected;

  if (rejectedHandler) {
    await rejectedHandler(fakeError);
  }
}
