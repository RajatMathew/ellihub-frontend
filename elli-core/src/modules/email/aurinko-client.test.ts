import { ExternalServiceError, TooManyRequestsError, UnauthorizedError } from '@utils';
import { describe, expect, test } from 'bun:test';

import { aurinkoClientInternals } from './aurinko-client';

import type { AxiosError } from 'axios';

const axiosError = (input: {
    status?: number;
    code?: string;
    headers?: Record<string, string>;
}): AxiosError =>
    ({
        isAxiosError: true,
        name: 'AxiosError',
        message: 'provider failure',
        code: input.code,
        response: input.status
            ? {
                  status: input.status,
                  statusText: 'Provider error',
                  headers: input.headers || {},
                  config: {},
                  data: { message: 'provider failure', requestId: 'request-1' },
              }
            : undefined,
        toJSON: () => ({}),
    }) as AxiosError;

describe('Aurinko error handling', () => {
    test('classifies connection failures as service unavailable', () => {
        const error = axiosError({ code: 'ECONNREFUSED' });

        expect(() => aurinkoClientInternals.mapError(error)).toThrow(ExternalServiceError);
        try {
            aurinkoClientInternals.mapError(error);
        } catch (mapped) {
            expect(mapped).toBeInstanceOf(ExternalServiceError);
            expect((mapped as ExternalServiceError).status).toBe(503);
            expect((mapped as ExternalServiceError).code).toBe('EMAIL_PROVIDER_CONNECTION');
        }
    });

    test('classifies provider timeouts as gateway timeouts', () => {
        const error = axiosError({ code: 'ETIMEDOUT' });

        try {
            aurinkoClientInternals.mapError(error);
        } catch (mapped) {
            expect(mapped).toBeInstanceOf(ExternalServiceError);
            expect((mapped as ExternalServiceError).status).toBe(504);
            expect((mapped as ExternalServiceError).code).toBe('EMAIL_PROVIDER_TIMEOUT');
        }
    });

    test('classifies aborted provider requests as gateway timeouts', () => {
        const error = axiosError({ code: 'ERR_CANCELED' });

        try {
            aurinkoClientInternals.mapError(error);
        } catch (mapped) {
            expect(mapped).toBeInstanceOf(ExternalServiceError);
            expect((mapped as ExternalServiceError).status).toBe(504);
            expect((mapped as ExternalServiceError).code).toBe('EMAIL_PROVIDER_TIMEOUT');
        }
    });

    test('preserves rate-limit retry timing', () => {
        const error = axiosError({ status: 429, headers: { 'retry-after': '3' } });

        try {
            aurinkoClientInternals.mapError(error);
        } catch (mapped) {
            expect(mapped).toBeInstanceOf(TooManyRequestsError);
            expect((mapped as TooManyRequestsError).retryAfterSeconds).toBe(3);
        }
    });

    test('marks invalid authorization as reconnect required', () => {
        const error = axiosError({ status: 401 });

        try {
            aurinkoClientInternals.mapError(error);
        } catch (mapped) {
            expect(mapped).toBeInstanceOf(UnauthorizedError);
            expect((mapped as UnauthorizedError).code).toBe('EMAIL_RECONNECT_REQUIRED');
        }
    });

    test('retries only transient upstream conditions', () => {
        expect(aurinkoClientInternals.isRetryableError(axiosError({ status: 408 }))).toBe(true);
        expect(aurinkoClientInternals.isRetryableError(axiosError({ status: 503 }))).toBe(true);
        expect(
            aurinkoClientInternals.isRetryableError(axiosError({ code: 'ConnectionRefused' }))
        ).toBe(false);
        expect(aurinkoClientInternals.isRetryableError(axiosError({ status: 400 }))).toBe(false);
        expect(aurinkoClientInternals.isRetryableError(axiosError({ status: 404 }))).toBe(false);
    });
});
