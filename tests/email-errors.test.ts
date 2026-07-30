import { describe, expect, test } from 'bun:test';

import axios from 'axios';

import {
  isEmailReconnectRequiredError,
  shouldRetryEmailRequest,
} from '../src/modules/email/lib/email-errors';

function reconnectError() {
  return new axios.AxiosError('Reconnect required', 'ERR_BAD_RESPONSE', undefined, undefined, {
    data: { details: { code: 'EMAIL_RECONNECT_REQUIRED' } },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config: { headers: new axios.AxiosHeaders() },
  });
}

describe('email request failure policy', () => {
  test('does not retry a provider account that requires reconnection', () => {
    const error = reconnectError();

    expect(isEmailReconnectRequiredError(error)).toBe(true);
    expect(shouldRetryEmailRequest(0, error)).toBe(false);
  });

  test('retains one retry for temporary failures', () => {
    const error = new axios.AxiosError('Network unavailable');

    expect(shouldRetryEmailRequest(0, error)).toBe(true);
    expect(shouldRetryEmailRequest(1, error)).toBe(false);
  });
});
