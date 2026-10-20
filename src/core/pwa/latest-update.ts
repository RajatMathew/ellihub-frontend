/**
 * Finding the newest deployed build before an update is applied.
 *
 * A registration keeps one waiting worker: the build that was deployed when the
 * browser last checked. If a second build is deployed while that one waits,
 * nothing learns of it until `sw.js` is fetched again — and the app used to stop
 * checking once anything was waiting. "Update now" then activated the older
 * build, and the next check prompted for the newer one: two updates for one
 * click. The service worker spec compares an update check against the newest
 * worker, waiting included, so a fresh check installs the newer build and it
 * replaces the older one as the waiting worker. This module makes that check
 * happen, and waits for it, before anything is activated.
 *
 * Kept free of `virtual:pwa-register` so it can be tested without a build.
 */

export const LATEST_INSTALL_TIMEOUT_MS = 30_000;

export interface UpdateCheckEnvironment {
  isOnline: () => boolean;
  /**
   * Fetches `sw.js` past every cache first, as vite-plugin-pwa's guide does:
   * a stale HTTP-cached copy would make `registration.update()` see no change.
   */
  fetchScript: (url: string) => Promise<void>;
}

/**
 * Asks the server whether a newer build exists, installing it if so. Skipped
 * only while a worker is already installing or the browser is offline — never
 * because one is waiting, which is what hid a second deploy behind the first.
 */
export async function checkForNewerWorker(
  registration: ServiceWorkerRegistration,
  swUrl: string | null,
  env: UpdateCheckEnvironment
): Promise<void> {
  if (registration.installing || !env.isOnline()) return;

  if (swUrl) await env.fetchScript(swUrl);
  await registration.update();
}

/**
 * Resolves once the worker now installing has finished — installed, or
 * discarded — or after `timeoutMs`, whichever comes first. Resolves at once
 * when nothing is installing.
 */
export function waitForInstallingWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs: number
): Promise<void> {
  const worker = registration.installing;
  if (!worker) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      worker.removeEventListener('statechange', onStateChange);
      resolve();
    };
    const onStateChange = () => {
      if (worker.state !== 'installing') finish();
    };
    const timer = setTimeout(finish, timeoutMs);

    worker.addEventListener('statechange', onStateChange);
  });
}

/**
 * The worker "Update now" should activate: the newest build the server has,
 * once it is installed. Falls back to whatever is already waiting when the
 * check fails, the browser is offline, or the newest build is still installing
 * after `timeoutMs` — an update the user asked for should not be blocked by a
 * slow network.
 */
export async function prepareLatestUpdate(
  registration: ServiceWorkerRegistration,
  swUrl: string | null,
  env: UpdateCheckEnvironment,
  timeoutMs = LATEST_INSTALL_TIMEOUT_MS
): Promise<ServiceWorker | null> {
  try {
    await checkForNewerWorker(registration, swUrl, env);
  } catch (error) {
    console.warn('Could not check for a newer build; applying the one already downloaded.', error);
  }

  await waitForInstallingWorker(registration, timeoutMs);

  return registration.waiting;
}
