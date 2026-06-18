import { useEffect, useState } from 'react';

import { registerSW } from 'virtual:pwa-register';

import { openPwaUpdateModal, PWA_UPDATE_AVAILABLE_EVENT } from './pwaEvents';

let globalRegistration: ServiceWorkerRegistration | null = null;
let globalUpdateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

const PWA_UPDATE_INTERVAL_MS = 15 * 60 * 1000;
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

export async function forceCheckForUpdate() {
  if (import.meta.env.DEV) return false;
  if (!globalRegistration) return false;

  await globalRegistration.update();

  const hasUpdate = !!globalRegistration.waiting;

  if (hasUpdate) {
    openPwaUpdateModal();
  }

  return hasUpdate;
}

export async function forceUpdateApp() {
  if (import.meta.env.DEV) return;
  if (!globalUpdateSW) return;

  await globalUpdateSW(false);

  window.setTimeout(() => {
    window.location.reload();
  }, 500);
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

      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        globalRegistration = registration;

        void registration.update().catch(logPwaUpdateError);

        updateInterval = window.setInterval(
          () => {
            void registration.update().catch(logPwaUpdateError);
          },
          PWA_UPDATE_INTERVAL_MS
        );
      },
    });

    globalUpdateSW = updateSW;

    return () => {
      if (updateInterval) {
        window.clearInterval(updateInterval);
      }
    };
  }, []);

  const checkForUpdates = async () => {
    if (!globalRegistration) return false;

    setChecking(true);

    try {
      await globalRegistration.update();

      const hasUpdate = !!globalRegistration.waiting;

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
  };

  const updateApp = async () => {
    if (!canUseServiceWorker()) return;
    if (!globalUpdateSW) return;

    setUpdating(true);
    setProgress(8);

    const progressTimer = window.setInterval(() => {
      setProgress((value) => Math.min(value + 5, 90));
    }, 250);

    const reloadApp = () => {
      setProgress(100);

      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    };

    const reloadFallback = window.setTimeout(() => {
      reloadApp();
    }, 5000);

    const onControllerChange = () => {
      window.clearTimeout(reloadFallback);
      reloadApp();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, {
      once: true,
    });

    try {
      // Fake delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 900));

      // Activate new service worker, but do NOT auto reload here
      await globalUpdateSW(false);

      setProgress(95);
    } catch (error) {
      console.error('PWA update failed:', error);

      window.clearInterval(progressTimer);
      window.clearTimeout(reloadFallback);

      setUpdating(false);
      setProgress(0);

      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    }
  };

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
