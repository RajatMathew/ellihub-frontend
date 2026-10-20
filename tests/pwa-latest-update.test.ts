import { describe, expect, mock, test } from 'bun:test';

import {
  checkForNewerWorker,
  prepareLatestUpdate,
  type UpdateCheckEnvironment,
} from '../src/core/pwa/latest-update';

/**
 * "Update now" after two deploys. v2 was downloaded and waiting when v3 went
 * out; the app stopped checking once anything waited, so the click activated
 * v2 and the next check asked to update again, to v3.
 */

class FakeWorker extends EventTarget {
  constructor(
    readonly build: string,
    public state: ServiceWorkerState = 'installing'
  ) {
    super();
  }

  finishInstalling(state: ServiceWorkerState = 'installed') {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

/**
 * A registration against a server whose latest build is `serverBuild`. Like a
 * browser, `update()` installs a build it does not have yet, and a finished
 * install replaces whatever was waiting.
 */
function fakeRegistration(options: {
  waiting?: string;
  serverBuild: string;
  /** Leave the new build installing, to test the timeout. */
  stallInstall?: boolean;
}) {
  const registration = {
    installing: null as FakeWorker | null,
    waiting: options.waiting ? new FakeWorker(options.waiting, 'installed') : null,
    update: mock(async () => {
      const newest = registration.installing ?? registration.waiting;
      if (newest?.build === options.serverBuild) return;

      const worker = new FakeWorker(options.serverBuild);
      registration.installing = worker;

      if (!options.stallInstall) {
        queueMicrotask(() => {
          registration.installing = null;
          registration.waiting = worker;
          worker.finishInstalling();
        });
      }
    }),
  };
  return registration;
}

const online = (): UpdateCheckEnvironment & { fetchScript: ReturnType<typeof mock> } => ({
  isOnline: () => true,
  fetchScript: mock(async () => {}),
});

const asRegistration = (fake: ReturnType<typeof fakeRegistration>) =>
  fake as unknown as ServiceWorkerRegistration;

const buildOf = (worker: ServiceWorker | null) => (worker as unknown as FakeWorker | null)?.build;

describe('Update now after two deploys', () => {
  test('activates the newest build, not the one that was waiting', async () => {
    const registration = fakeRegistration({ waiting: 'v2', serverBuild: 'v3' });

    const worker = await prepareLatestUpdate(asRegistration(registration), '/sw.js', online());

    expect(buildOf(worker)).toBe('v3');
  });

  test('fetches sw.js past the caches before asking the browser to update', async () => {
    const registration = fakeRegistration({ waiting: 'v2', serverBuild: 'v3' });
    const env = online();

    await checkForNewerWorker(asRegistration(registration), '/sw.js', env);

    expect(env.fetchScript).toHaveBeenCalledWith('/sw.js');
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  test('still checks the server while a build is waiting', async () => {
    const registration = fakeRegistration({ waiting: 'v2', serverBuild: 'v2' });

    await checkForNewerWorker(asRegistration(registration), '/sw.js', online());

    expect(registration.update).toHaveBeenCalledTimes(1);
  });
});

describe('Update now with a single deploy', () => {
  test('activates the build that was waiting', async () => {
    const registration = fakeRegistration({ waiting: 'v2', serverBuild: 'v2' });

    const worker = await prepareLatestUpdate(asRegistration(registration), '/sw.js', online());

    expect(buildOf(worker)).toBe('v2');
  });
});

describe('Update now when the newest build cannot be had', () => {
  test('applies the waiting build when offline, without checking', async () => {
    const registration = fakeRegistration({ waiting: 'v2', serverBuild: 'v3' });
    const env = { ...online(), isOnline: () => false };

    const worker = await prepareLatestUpdate(asRegistration(registration), '/sw.js', env);

    expect(registration.update).not.toHaveBeenCalled();
    expect(buildOf(worker)).toBe('v2');
  });

  test('applies the waiting build when the check fails', async () => {
    const registration = fakeRegistration({ waiting: 'v2', serverBuild: 'v3' });
    const env = {
      isOnline: () => true,
      fetchScript: mock(async () => {
        throw new Error('503');
      }),
    };

    const worker = await prepareLatestUpdate(asRegistration(registration), '/sw.js', env);

    expect(buildOf(worker)).toBe('v2');
  });

  test('gives up waiting for a stalled install after the timeout', async () => {
    const registration = fakeRegistration({ waiting: 'v2', serverBuild: 'v3', stallInstall: true });

    const started = performance.now();
    const worker = await prepareLatestUpdate(asRegistration(registration), '/sw.js', online(), 50);

    expect(performance.now() - started).toBeLessThan(1000);
    expect(buildOf(worker)).toBe('v2');
  });
});
