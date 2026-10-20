import { describe, expect, test } from 'bun:test';

import { switcherOffersManageAccounts } from '../src/modules/email/lib/mailbox-switcher';

// elli-ui#1082: "Manage accounts" sits on the sidebar's Email section, and the
// mailbox switcher repeats it only when the sidebar is not there to use.

describe('the mailbox switcher', () => {
  test('leaves Manage accounts to the sidebar while the sidebar is open', () => {
    expect(switcherOffersManageAccounts({ isMobile: false, isSidebarOpen: true })).toBe(false);
  });

  test('offers it once the sidebar is collapsed', () => {
    expect(switcherOffersManageAccounts({ isMobile: false, isSidebarOpen: false })).toBe(true);
  });

  test('offers it on a phone, where the sidebar is behind the menu button', () => {
    expect(switcherOffersManageAccounts({ isMobile: true, isSidebarOpen: true })).toBe(true);
  });
});
