import { describe, expect, test } from 'bun:test';

import {
  EMAIL_RECONNECT_REQUIRED_CODE,
  getApiErrorCode,
  shouldRedirectToSignIn,
} from '../src/app/api/api-error-code';

describe('API authorization error routing', () => {
  test('reads provider authorization codes from the API details envelope', () => {
    const response = {
      success: false,
      details: { code: EMAIL_RECONNECT_REQUIRED_CODE },
    };

    expect(getApiErrorCode(response)).toBe(EMAIL_RECONNECT_REQUIRED_CODE);
    expect(shouldRedirectToSignIn(401, response)).toBe(false);
  });

  test('still redirects for an expired Elli session', () => {
    expect(shouldRedirectToSignIn(401, { details: { code: 'UNAUTHORIZED' } })).toBe(true);
  });
});
