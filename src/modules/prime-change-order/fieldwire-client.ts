import { BadRequestError } from '@utils';
import axios from 'axios';
import z from 'zod';

import {
    FieldwireChangeOrdersSchema,
    FieldwireProjectsSchema,
    FieldwireProjectUsersSchema,
} from './models';

const FIELDWIRE_AUTH_URL = 'https://client-api.super.fieldwire.com/api_keys/jwt';
const FIELDWIRE_API_BASE_URL = 'https://client-api.us.fieldwire.com/api/v3';
const FIELDWIRE_PAGE_SIZE = '1000';
const FIELDWIRE_MAX_PAGES = 100;
const FIELDWIRE_DEBUG_RESPONSE_MAX_LENGTH = 2000;

const FieldwireTokenSchema = z.object({
    access_token: z.string().min(1),
});

const getFieldwireToken = () => {
    const token = process.env.FIELDWIRE_API_TOKEN;
    if (!token) {
        throw new BadRequestError('FIELDWIRE_API_TOKEN is not configured');
    }
    return token;
};

export const getFieldwireVersionDate = () => new Date().toISOString().slice(0, 10);

type FieldwireListSchema<T> = {
    parse: (data: unknown) => T[];
};

type FieldwireListRequestConfig = {
    headers: Record<string, string>;
    params?: Record<string, string>;
};

const parseHasMore = (value: unknown): boolean => String(value).toLowerCase() === 'true';

const getHeaderValue = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
};

const getResponseHeader = (headers: unknown, name: string): string | undefined => {
    if (!headers || typeof headers !== 'object') return undefined;

    const record = headers as Record<string, unknown>;
    return (
        getHeaderValue(record[name]) ??
        getHeaderValue(record[name.toLowerCase()]) ??
        getHeaderValue(record[name.toUpperCase()])
    );
};

const truncateDebugValue = (value: string): string =>
    value.length > FIELDWIRE_DEBUG_RESPONSE_MAX_LENGTH
        ? `${value.slice(0, FIELDWIRE_DEBUG_RESPONSE_MAX_LENGTH)}...<truncated>`
        : value;

const getDebugResponseData = (data: unknown): unknown => {
    if (typeof data === 'string') return truncateDebugValue(data);

    try {
        const serialized = JSON.stringify(data);
        if (!serialized) return data;

        return JSON.parse(truncateDebugValue(serialized));
    } catch {
        return data;
    }
};

const getFieldwireResponseErrors = (data: unknown): string[] => {
    if (!data || typeof data !== 'object' || !('errors' in data)) return [];

    const errors = (data as { errors?: unknown }).errors;
    if (!Array.isArray(errors)) return [];

    return errors.filter((error): error is string => typeof error === 'string' && error.length > 0);
};

const formatFieldwireUserMessage = (
    details: NonNullable<ReturnType<typeof getFieldwireAxiosErrorDetails>>
) => {
    const errors = getFieldwireResponseErrors(details.responseData);

    if (errors.some((error) => error === 'Change orders must be enabled on the project')) {
        return 'Fieldwire Change Orders are not enabled for this project. Enable Change Orders in Fieldwire, then sync again.';
    }

    if (errors.length > 0) {
        return `Fieldwire rejected the sync: ${errors.join('; ')}`;
    }

    if (details.status === 403) {
        return 'Fieldwire denied access to this project. Confirm the Fieldwire API user has access and the required project features are enabled.';
    }

    return 'Fieldwire sync failed. Check the server logs for the Fieldwire response details.';
};

export const getFieldwireAxiosErrorDetails = (error: unknown) => {
    if (!axios.isAxiosError(error)) return null;

    return {
        code: error.code,
        message: error.message,
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseHeaders: {
            requestId:
                getResponseHeader(error.response?.headers, 'x-request-id') ??
                getResponseHeader(error.response?.headers, 'x-correlation-id'),
            rateLimitRemaining: getResponseHeader(error.response?.headers, 'x-ratelimit-remaining'),
            retryAfter: getResponseHeader(error.response?.headers, 'retry-after'),
        },
        responseData: getDebugResponseData(error.response?.data),
    };
};

export const getFieldwireErrorMessage = (error: unknown): string | null => {
    const details = getFieldwireAxiosErrorDetails(error);
    if (!details) return null;

    return formatFieldwireUserMessage(details);
};

const getFieldwireList = async <T>(
    url: string,
    schema: FieldwireListSchema<T>,
    config: FieldwireListRequestConfig
): Promise<T[]> => {
    const results: T[] = [];
    const seenCursors = new Set<string>();
    let lastSyncedAt: string | undefined;

    for (let page = 0; page < FIELDWIRE_MAX_PAGES; page += 1) {
        const response = await axios.get(url, {
            headers: {
                ...config.headers,
                'Fieldwire-Per-Page': FIELDWIRE_PAGE_SIZE,
            },
            params: {
                ...config.params,
                ...(lastSyncedAt ? { last_synced_at: lastSyncedAt } : {}),
            },
        });

        results.push(...schema.parse(response.data));

        if (!parseHasMore(getResponseHeader(response.headers, 'x-has-more'))) {
            return results;
        }

        const nextLastSyncedAt = getResponseHeader(response.headers, 'x-last-synced-at');
        if (!nextLastSyncedAt) {
            throw new BadRequestError('Fieldwire pagination response is missing X-Last-Synced-At');
        }

        if (seenCursors.has(nextLastSyncedAt)) {
            throw new BadRequestError('Fieldwire pagination cursor did not advance');
        }

        seenCursors.add(nextLastSyncedAt);
        lastSyncedAt = nextLastSyncedAt;
    }

    throw new BadRequestError('Fieldwire pagination exceeded the safety page limit');
};

const getFieldwireHeaders = (bearerToken: string, filter?: 'active' | 'deleted' | 'all') => ({
    ...(filter ? { 'Fieldwire-Filter': filter } : {}),
    'Fieldwire-Version': getFieldwireVersionDate(),
    accept: 'application/json',
    authorization: `Bearer ${bearerToken}`,
});

export const FieldwireClient = {
    getAccessToken: async (): Promise<string> => {
        const response = await axios.post(
            FIELDWIRE_AUTH_URL,
            { api_token: getFieldwireToken() },
            {
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
            }
        );

        return FieldwireTokenSchema.parse(response.data).access_token;
    },

    getChangeOrders: async (fieldwireProjectId: string, accessToken?: string) => {
        const bearerToken = accessToken ?? (await FieldwireClient.getAccessToken());
        return getFieldwireList(
            `${FIELDWIRE_API_BASE_URL}/projects/${fieldwireProjectId}/change_orders`,
            FieldwireChangeOrdersSchema,
            {
                headers: getFieldwireHeaders(bearerToken),
            }
        );
    },

    getProjects: async (accessToken?: string) => {
        const bearerToken = accessToken ?? (await FieldwireClient.getAccessToken());
        return getFieldwireList(`${FIELDWIRE_API_BASE_URL}/projects`, FieldwireProjectsSchema, {
            headers: getFieldwireHeaders(bearerToken, 'active'),
        });
    },

    getProjectUsers: async (fieldwireProjectId: string, accessToken?: string) => {
        const bearerToken = accessToken ?? (await FieldwireClient.getAccessToken());
        return getFieldwireList(
            `${FIELDWIRE_API_BASE_URL}/account/projects/${encodeURIComponent(
                fieldwireProjectId
            )}/users`,
            FieldwireProjectUsersSchema,
            {
                headers: getFieldwireHeaders(bearerToken),
            }
        );
    },
};
