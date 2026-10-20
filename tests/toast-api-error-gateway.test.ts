import { describe, expect, test } from 'bun:test';

import { getApiErrorMessage, SERVER_UNREACHABLE_MESSAGE } from '../src/app/lib/toast-api-error';

/**
 * What a toast says when the API never answered (elli-ui#1240).
 *
 * A 502 from the proxy in front of elli-core has a status but none of the
 * API's JSON. The toast fell through to Axios's own message and read
 * "Request failed with status code 502".
 */

const axiosError = (status: number, data?: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });

describe('an error toast', () => {
  test('says the server could not be reached for a gateway page', () => {
    for (const status of [502, 503, 504]) {
      expect(getApiErrorMessage(axiosError(status, '<html>Bad Gateway</html>'), 'Fallback')).toBe(
        SERVER_UNREACHABLE_MESSAGE
      );
    }
  });

  test("uses the caller's message for any other status without an API message", () => {
    expect(getApiErrorMessage(axiosError(404), 'Calendar not found.')).toBe('Calendar not found.');
  });

  test("still shows the API's own message when there is one", () => {
    const error = axiosError(503, { message: 'The email provider is temporarily unavailable.' });

    expect(getApiErrorMessage(error, 'Fallback')).toBe(
      'The email provider is temporarily unavailable.'
    );
  });

  test('never shows the raw Axios message', () => {
    expect(getApiErrorMessage(axiosError(502), 'Fallback')).not.toContain('status code');
  });
});
