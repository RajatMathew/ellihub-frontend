import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  getApiErrorMessage,
  REQUEST_TIMEOUT_MESSAGE,
  SERVER_UNREACHABLE_MESSAGE,
} from '../src/app/lib/toast-api-error';

/** A request that never got an answer reads as something a user can act on. */

const config = (url: string) =>
  ({ url, method: 'get', timeout: 30_000, headers: {} }) as unknown as InternalAxiosRequestConfig;

let warnings: string[] = [];
const originalWarn = console.warn;
beforeEach(() => {
  warnings = [];
  console.warn = (message: string) => warnings.push(message);
});
afterEach(() => {
  console.warn = originalWarn;
});

describe('a request the client gave up on', () => {
  test('says it is taking long, not "timeout of 30000ms exceeded"', () => {
    const error = new AxiosError(
      'timeout of 30000ms exceeded',
      'ECONNABORTED',
      config('/email/accounts/a1/conversations/t1/messages?token=SECRET')
    );
    expect(getApiErrorMessage(error, 'Fallback')).toBe(REQUEST_TIMEOUT_MESSAGE);
  });

  test('names the endpoint it was, without the query string', () => {
    const error = new AxiosError(
      'timeout of 30000ms exceeded',
      'ECONNABORTED',
      config('/email/accounts/a1/folders?token=SECRET')
    );
    getApiErrorMessage(error, 'Fallback');
    const logged = JSON.parse(warnings[0]!) as Record<string, unknown>;
    expect(logged).toEqual({
      event: 'api_timeout',
      method: 'GET',
      path: '/email/accounts/a1/folders',
      timeoutMs: 30_000,
    });
    expect(warnings.join('')).not.toContain('SECRET');
  });

  test('a dropped connection says the server could not be reached', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', config('/task/board'));
    expect(getApiErrorMessage(error, 'Fallback')).toBe(SERVER_UNREACHABLE_MESSAGE);
  });

  test('a cancelled request is not reported as a timeout', () => {
    const error = new AxiosError('Request aborted', 'ECONNABORTED', config('/task/board'));
    expect(getApiErrorMessage(error, 'Fallback')).not.toBe(REQUEST_TIMEOUT_MESSAGE);
    expect(warnings).toHaveLength(0);
  });
});
