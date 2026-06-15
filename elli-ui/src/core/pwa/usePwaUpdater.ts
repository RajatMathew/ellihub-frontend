import { useEffect, useState } from 'react';

import { registerSW } from 'virtual:pwa-register';

import { openPwaUpdateModal, PWA_UPDATE_AVAILABLE_EVENT } from './pwaEvents';

let globalRegistration: ServiceWorkerRegistration | null = null;
let globalUpdateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

export async function forceCheckForUpdate() {
  if (!globalRegistration) return false;

  await globalRegistration.update();

  const hasUpdate = !!globalRegistration.waiting;

  if (hasUpdate) {
    openPwaUpdateModal();
  }

  return hasUpdate;
}

export async function forceUpdateApp() {
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
    const updateSW = registerSW({
      immediate: true,

      onNeedRefresh() {
        setNeedRefresh(true);
      },

      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        globalRegistration = registration;

        registration.update();

        setInterval(
          () => {
            registration.update();
          },
          15 * 60 * 1000
        );
      },
    });

    globalUpdateSW = updateSW;
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
    } finally {
      setChecking(false);
    }
  };

  const updateApp = async () => {
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
