import { describe, expect, mock, test } from 'bun:test';

import { getCrumbLabelForPath, getTitleForPathname } from '../src/app/routing/config/route-lookup';

// elli-ui#1084: the page for connecting a mailbox had no title of its own, so
// its breadcrumb fell back to the Email section's and read "Email > Email".
//
// Runs against the real route tree. Its imports reach the PWA register module,
// `__APP_VERSION__` and the auth client's API address, which only a Vite build
// provides, so all three are stood in for before it loads.
mock.module('virtual:pwa-register', () => ({ registerSW: () => async () => {} }));
Object.assign(globalThis, { __APP_VERSION__: 'test' });
process.env.VITE_API_BASE_URL ||= 'http://localhost:9000';

const { routeTree } = await import('../src/app/routing/config/routes');

describe('the add account page', () => {
  test('is titled for what it does, not after its section', () => {
    expect(getTitleForPathname('/app/email/add-account', routeTree)).toBe('Add Account');
  });

  test('has its own crumb under Email', () => {
    expect(getCrumbLabelForPath('/app/email/add-account', routeTree)?.label).toBe('Add Account');
    expect(getCrumbLabelForPath('/app/email', routeTree)?.label).toBe('Email');
  });
});
