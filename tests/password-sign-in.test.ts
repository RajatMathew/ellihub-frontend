import { describe, expect, test } from 'bun:test';

import { hasPasswordAccount, isPasswordSignInEnabled } from '../src/core/auth/lib/password-sign-in';
import { getPasswordSectionState } from '../src/modules/profile/lib/password-section';

describe('password sign-in', () => {
  test('is on unless the API says it is off', () => {
    expect(isPasswordSignInEnabled({ methods: { password: true } })).toBe(true);
    expect(isPasswordSignInEnabled({ methods: { password: false } })).toBe(false);
    // An API from before the switch reports no methods, or no password.
    expect(isPasswordSignInEnabled({ methods: { magicLink: true } })).toBe(true);
    expect(isPasswordSignInEnabled({})).toBe(true);
    expect(isPasswordSignInEnabled(null)).toBe(true);
  });

  test('a password is a credential account', () => {
    expect(hasPasswordAccount([{ providerId: 'microsoft' }, { providerId: 'credential' }])).toBe(
      true
    );
    expect(hasPasswordAccount([{ providerId: 'microsoft' }])).toBe(false);
    expect(hasPasswordAccount([])).toBe(false);
  });
});

describe('the password part of My Profile > Security', () => {
  const state = (overrides: Partial<Parameters<typeof getPasswordSectionState>[0]> = {}) =>
    getPasswordSectionState({
      status: 'success',
      passwordEnabled: true,
      hasPassword: true,
      ...overrides,
    });

  test('changes the password the user has', () => {
    expect(state()).toBe('change');
  });

  test('offers to set one, by email, to a user without one', () => {
    expect(state({ hasPassword: false })).toBe('set');
  });

  test('is gone while password sign-in is off', () => {
    expect(state({ passwordEnabled: false })).toBe('hidden');
    expect(state({ passwordEnabled: false, hasPassword: false })).toBe('hidden');
  });

  test('waits for the sign-in methods, and falls back to the change form if they fail', () => {
    expect(state({ status: 'pending' })).toBe('loading');
    expect(state({ status: 'error', passwordEnabled: false })).toBe('change');
  });
});
