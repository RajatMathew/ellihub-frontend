import { describe, expect, test } from 'bun:test';

import { getErrorStatus, shouldRetryQuery } from '../src/app/lib/query-retry';

const axiosError = (status: number) => ({ response: { status }, isAxiosError: true });

describe('getErrorStatus', () => {
  test('reads the status off an axios error response', () => {
    expect(getErrorStatus(axiosError(403))).toBe(403);
  });

  test('reads a status copied onto the error itself', () => {
    expect(getErrorStatus({ status: 500 })).toBe(500);
  });

  test('has no status for a thrown Error or a nullish value', () => {
    expect(getErrorStatus(new Error('Network Error'))).toBeUndefined();
    expect(getErrorStatus(null)).toBeUndefined();
    expect(getErrorStatus(undefined)).toBeUndefined();
  });
});

describe('a client error is not retried', () => {
  // Asking again cannot change any of these, and `retry: 1` asked again.
  for (const status of [400, 401, 403, 404, 409, 422]) {
    test(`${status} is answered once`, () => {
      expect(shouldRetryQuery(0, axiosError(status))).toBe(false);
    });
  }
});

describe('a failure that could clear on its own is retried once', () => {
  for (const status of [408, 429, 500, 502, 503, 504]) {
    test(`${status} is retried`, () => {
      expect(shouldRetryQuery(0, axiosError(status))).toBe(true);
    });
  }

  test('a network failure with no response is retried', () => {
    expect(shouldRetryQuery(0, new Error('Network Error'))).toBe(true);
  });

  test('but only once, keeping the previous retry budget', () => {
    expect(shouldRetryQuery(1, axiosError(503))).toBe(false);
    expect(shouldRetryQuery(1, new Error('Network Error'))).toBe(false);
  });
});
