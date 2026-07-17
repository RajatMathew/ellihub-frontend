import { useCallback, useEffect, useState } from 'react';

import { registerSW } from 'virtual:pwa-register';

import { openPwaUpdateModal, PWA_UPDATE_AVAILABLE_EVENT } from './pwaEvents';

let globalRegistration: ServiceWorkerRegistration | null = null;
let globalSwUrl: string | null = null;
let globalUpdateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let updateCheckPromise: Promise<boolean> | null = null;

const PWA_UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const PWA_CONTROLLER_CHANGE_TIMEOUT_MS = 3000;
const DEV_SW_CLEANUP_RELOAD_KEY = 'elli-dev-sw-cleanup-reloaded';

function canUseServiceWorker() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

function isCurrentOriginRegistration(registration: ServiceWorkerRegistration) {
  try {
    return new URL(registration.scope).origin === window.location.origin;
  } catch {
    return true;
  }
}

async function unregisterDevelopmentServiceWorkers() {
  if (!canUseServiceWorker()) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const currentOriginRegistrations = registrations.filter(isCurrentOriginRegistration);

  await Promise.all(currentOriginRegistrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  globalRegistration = null;
  globalSwUrl = null;
  globalUpdateSW = null;

  if (
    currentOriginRegistrations.length > 0 &&
    navigator.serviceWorker.controller &&
    sessionStorage.getItem(DEV_SW_CLEANUP_RELOAD_KEY) !== '1'
  ) {
    sessionStorage.setItem(DEV_SW_CLEANUP_RELOAD_KEY, '1');
    window.location.reload();
    return;
  }

  sessionStorage.removeItem(DEV_SW_CLEANUP_RELOAD_KEY);
}

function logPwaUpdateError(error: unknown) {
  console.error('PWA update check failed:', error);
}

async function fetchServiceWorkerWithoutCache(swUrl: string) {
  const response = await fetch(swUrl, {
    cache: 'no-store',
    headers: {
      cache: 'no-store',
      'cache-control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Service worker update check failed with status ${response.status}.`);
  }
}

async function checkRegistrationForUpdate({ notify = true } = {}) {
  if (import.meta.env.DEV) return false;
  if (!globalRegistration) return false;
  if (globalRegistration.waiting) {
    if (notify) openPwaUpdateModal();
    return true;
  }

  if (!navigator.onLine || globalRegistration.installing) return false;

  if (!updateCheckPromise) {
    updateCheckPromise = (async () => {
      if (globalSwUrl) {
        await fetchServiceWorkerWithoutCache(globalSwUrl);
      }

      await globalRegistration?.update();

      return !!globalRegistration?.waiting;
    })().finally(() => {
      updateCheckPromise = null;
    });
  }

  const hasUpdate = await updateCheckPromise;
  if (hasUpdate && notify) openPwaUpdateModal();

  return hasUpdate;
}

function createControllerChangeWaiter(timeoutMs: number) {
  let cleanup = () => {};

  const promise = new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const timeoutId = window.setTimeout(finish, timeoutMs);
    const onControllerChange = () => finish();

    cleanup = () => {
      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, {
      once: true,
    });
  });

  return { promise, cleanup };
}

export async function forceCheckForUpdate() {
  return checkRegistrationForUpdate({ notify: true });
}

export async function forceUpdateApp() {
  if (import.meta.env.DEV) return;
  if (!globalUpdateSW) {
    window.location.reload();
    return;
  }

  if (!globalRegistration?.waiting) {
    window.location.reload();
    return;
  }

  const controllerChange = canUseServiceWorker()
    ? createControllerChangeWaiter(PWA_CONTROLLER_CHANGE_TIMEOUT_MS)
    : null;

  try {
    await globalUpdateSW(false);
    if (controllerChange) await controllerChange.promise;
  } finally {
    controllerChange?.cleanup();
    window.location.reload();
  }
}

export function usePwaUpdater() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const openModalListener = () => {
      setNeedRefresh(true);
    };

    window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, openModalListener);

    return () => {
      window.removeEventListener(PWA_UPDATE_AVAILABLE_EVENT, openModalListener);
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      void unregisterDevelopmentServiceWorkers().catch((error) => {
        console.error('Failed to clean up development service workers:', error);
      });
      return;
    }

    let updateInterval: number | undefined;

    const updateSW = registerSW({
      immediate: true,

      onNeedRefresh() {
        setNeedRefresh(true);
      },

      onRegisteredSW(swUrl, registration) {
        if (!registration) return;

        globalRegistration = registration;
        globalSwUrl = swUrl;

        void checkRegistrationForUpdate().catch(logPwaUpdateError);

        updateInterval = window.setInterval(() => {
          void checkRegistrationForUpdate().catch(logPwaUpdateError);
        }, PWA_UPDATE_INTERVAL_MS);
      },
    });

    globalUpdateSW = updateSW;

    return () => {
      if (updateInterval) {
        window.clearInterval(updateInterval);
      }
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);

    try {
      const hasUpdate = await checkRegistrationForUpdate({ notify: false });

      if (hasUpdate) {
        setNeedRefresh(true);
      }

      return hasUpdate;
    } catch (error) {
      logPwaUpdateError(error);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  const updateApp = useCallback(async () => {
    if (!canUseServiceWorker()) return;
    if (!globalUpdateSW) return;

    setUpdating(true);
    setProgress(35);

    if (!globalRegistration?.waiting) {
      setProgress(100);
      window.location.reload();
      return;
    }

    const controllerChange = createControllerChangeWaiter(PWA_CONTROLLER_CHANGE_TIMEOUT_MS);

    try {
      await globalUpdateSW(false);
      setProgress(80);
      await controllerChange.promise;
      setProgress(100);
      window.location.reload();
    } catch (error) {
      console.error('PWA update failed:', error);
      controllerChange.cleanup();
      setUpdating(false);
      setProgress(0);
    }
  }, []);

  return {
    needRefresh,
    updating,
    checking,
    progress,
    checkForUpdates,
    updateApp,
    close: () => setNeedRefresh(false),
  };
}
