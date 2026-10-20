import { afterEach, describe, expect, test } from 'bun:test';

import { getAuthCallbackErrorMessage } from '../src/core/auth/lib/auth-redirect';
import {
  buildMagicLinkVerifyUrl,
  captureMagicLinkToken,
  clearCapturedMagicLinkToken,
  getCapturedMagicLinkToken,
  getMagicLinkRequestErrorMessage,
  isMagicLinkEnabled,
  readMagicLinkToken,
  redactMagicLinkToken,
  redactMagicLinkTokensInEvent,
  secondsUntil,
  subscribeToCapturedMagicLinkToken,
  watchForMagicLinkTokens,
} from '../src/core/auth/lib/magic-link';

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';

function fakeBrowser(url: string) {
  const parsed = new URL(url);
  const replaced: string[] = [];
  const location = { hash: parsed.hash, pathname: parsed.pathname, search: parsed.search };
  return {
    location,
    history: {
      state: { idx: 0 },
      // As a browser does: the address changes in place.
      replaceState: (_state: unknown, _unused: string, next?: string | URL | null) => {
        replaced.push(String(next));
        const updated = new URL(String(next), parsed.origin);
        Object.assign(location, {
          hash: updated.hash,
          pathname: updated.pathname,
          search: updated.search,
        });
      },
    },
    replaced,
  };
}

afterEach(() => clearCapturedMagicLinkToken());

describe('a sign-in link arriving at the app', () => {
  test('has its token taken out of the address bar and kept for the sign-in page', () => {
    const browser = fakeBrowser(`https://app.example.com/sign-in?next=%2Fapp#magic-link=${TOKEN}`);

    captureMagicLinkToken(browser.location, browser.history);

    expect(browser.replaced).toEqual(['/sign-in?next=%2Fapp']);
    expect(getCapturedMagicLinkToken()).toBe(TOKEN);
  });

  test('has a malformed token removed too, but not kept', () => {
    const browser = fakeBrowser('https://app.example.com/sign-in#magic-link=<script>');

    captureMagicLinkToken(browser.location, browser.history);

    expect(browser.replaced).toEqual(['/sign-in']);
    expect(getCapturedMagicLinkToken()).toBeNull();
  });

  test('leaves any other URL alone', () => {
    const browser = fakeBrowser('https://app.example.com/app/files#section-2');

    captureMagicLinkToken(browser.location, browser.history);

    expect(browser.replaced).toEqual([]);
    expect(getCapturedMagicLinkToken()).toBeNull();
  });

  test('is caught when it arrives in a tab already showing the app', () => {
    const browser = fakeBrowser('https://app.example.com/sign-in?next=%2Fapp');
    const handlers = new Map<string, () => void>();
    const target = {
      location: browser.location,
      history: browser.history,
      addEventListener: (type: string, handler: () => void) => handlers.set(type, handler),
    } as unknown as Window;
    let notified = 0;
    const unsubscribe = subscribeToCapturedMagicLinkToken(() => notified++);

    watchForMagicLinkTokens(target);
    expect(getCapturedMagicLinkToken()).toBeNull();

    // Only the fragment changes: no page load, just the fragment events.
    browser.location.hash = `#magic-link=${TOKEN}`;
    handlers.get('popstate')?.();
    handlers.get('hashchange')?.();

    expect(getCapturedMagicLinkToken()).toBe(TOKEN);
    expect(browser.replaced).toEqual(['/sign-in?next=%2Fapp']);
    expect(notified).toBe(1);

    clearCapturedMagicLinkToken();
    expect(notified).toBe(2);
    unsubscribe();
  });

  test('accepts only a token-shaped value', () => {
    expect(readMagicLinkToken(`#magic-link=${TOKEN}`)).toBe(TOKEN);
    expect(readMagicLinkToken('#magic-link=short')).toBeNull();
    expect(readMagicLinkToken('#other=1')).toBeNull();
    expect(readMagicLinkToken('')).toBeNull();
  });
});

describe('continuing a sign-in link', () => {
  test('opens the API verify endpoint, returning to the app either way', () => {
    const url = new URL(
      buildMagicLinkVerifyUrl({
        verifyEndpoint: new URL('https://api.example.com/api/v1/auth/magic-link/verify'),
        appOrigin: 'https://app.example.com',
        token: TOKEN,
        next: '/app/projects?tab=files',
      })
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      'https://api.example.com/api/v1/auth/magic-link/verify'
    );
    expect(url.searchParams.get('token')).toBe(TOKEN);
    expect(url.searchParams.get('callbackURL')).toBe(
      'https://app.example.com/app/projects?tab=files'
    );
    expect(url.searchParams.get('errorCallbackURL')).toBe(
      'https://app.example.com/sign-in?next=%2Fapp%2Fprojects%3Ftab%3Dfiles'
    );
  });

  test('explains a used or expired link', () => {
    expect(getAuthCallbackErrorMessage('INVALID_TOKEN')).toContain('or a newer link was sent');
  });
});

describe('analytics', () => {
  test('never receive a sign-in link token', () => {
    const event = {
      uuid: '1',
      properties: {
        $current_url: `https://app.example.com/sign-in#magic-link=${TOKEN}`,
        $pathname: '/sign-in',
        count: 2,
      },
      $set_once: {
        $initial_current_url: `https://app.example.com/sign-in?x=1&magic-link=${TOKEN}`,
      },
    };

    const redacted = redactMagicLinkTokensInEvent(event);

    expect(JSON.stringify(redacted)).not.toContain(TOKEN);
    expect(redacted?.properties.$current_url).toBe(
      'https://app.example.com/sign-in#magic-link=[redacted]'
    );
    expect(redacted?.properties.count).toBe(2);
    expect(redacted).not.toHaveProperty('$set');
    expect(redactMagicLinkTokensInEvent(null)).toBeNull();
    expect(redactMagicLinkToken('https://app.example.com/app')).toBe('https://app.example.com/app');
  });
});

describe('requesting a sign-in link', () => {
  test('counts down whole seconds to the next allowed request', () => {
    expect(secondsUntil(60_000, 0)).toBe(60);
    expect(secondsUntil(60_000, 59_001)).toBe(1);
    expect(secondsUntil(60_000, 60_000)).toBe(0);
    expect(secondsUntil(60_000, 90_000)).toBe(0);
  });

  test('explains a refusal by its status', () => {
    expect(getMagicLinkRequestErrorMessage(429)).toContain('Wait a minute');
    expect(getMagicLinkRequestErrorMessage(404)).toContain('not available');
    expect(getMagicLinkRequestErrorMessage(500)).toContain('could not be sent');
  });

  test('is offered only when the API reports it switched on', () => {
    expect(isMagicLinkEnabled({ providers: {}, methods: { magicLink: true } })).toBe(true);
    expect(isMagicLinkEnabled({ providers: {}, methods: { magicLink: false } })).toBe(false);
    // An API from before sign-in links reports no methods at all.
    expect(isMagicLinkEnabled({ providers: { microsoft: true } })).toBe(false);
    expect(isMagicLinkEnabled(null)).toBe(false);
  });
});
