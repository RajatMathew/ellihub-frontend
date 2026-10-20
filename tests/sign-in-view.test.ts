import { describe, expect, test } from 'bun:test';

import {
  canContinueWithSignInLink,
  getInitialSignInMethod,
  resolveSignInView,
} from '../src/core/auth/lib/sign-in-view';

const view = (
  overrides: Partial<Parameters<typeof resolveSignInView>[0]> = {}
): ReturnType<typeof resolveSignInView> =>
  resolveSignInView({
    chosen: null,
    capabilities: 'loaded',
    magicLinkEnabled: true,
    passwordEnabled: true,
    ...overrides,
  });

describe('the sign-in page', () => {
  test('opens on the sign-in link when the API offers it', () => {
    expect(view()).toBe('magic-link');
  });

  test('shows a placeholder, not the password form, until it knows', () => {
    expect(view({ capabilities: 'loading' })).toBe('loading');
  });

  test('falls back to the password when links are off or the API cannot be asked', () => {
    expect(view({ magicLinkEnabled: false })).toBe('password');
    expect(view({ capabilities: 'error', magicLinkEnabled: false })).toBe('password');
  });

  test('shows the password form at once when that is what was chosen', () => {
    expect(view({ chosen: 'password', capabilities: 'loading' })).toBe('password');
    expect(view({ chosen: 'password' })).toBe('password');
  });

  test('opens on the password straight after a password reset', () => {
    expect(getInitialSignInMethod(new URLSearchParams('pwd_reset=success'))).toBe('password');
    expect(getInitialSignInMethod(new URLSearchParams('next=%2Fapp'))).toBeNull();
  });
});

describe('the sign-in page with password sign-in off', () => {
  test('offers only the sign-in link, even when the password was asked for', () => {
    expect(view({ passwordEnabled: false })).toBe('magic-link');
    expect(view({ passwordEnabled: false, chosen: 'password' })).toBe('magic-link');
  });

  test('leaves only the social provider when links are off too', () => {
    expect(view({ passwordEnabled: false, magicLinkEnabled: false })).toBe('social-only');
  });
});

describe('a sign-in link opened from an email', () => {
  test('says it no longer works once the API reports links off', () => {
    expect(canContinueWithSignInLink('loaded', false)).toBe(false);
  });

  test('offers Continue while links are on, and while the API is still being asked', () => {
    expect(canContinueWithSignInLink('loaded', true)).toBe(true);
    expect(canContinueWithSignInLink('loading', false)).toBe(true);
    // The API answers the link itself, with a reason, if it is off.
    expect(canContinueWithSignInLink('error', false)).toBe(true);
  });
});
