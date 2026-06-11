import { BadRequestError } from '@utils';
import axios from 'axios';
import z from 'zod';

import { QUICKBOOKS_ACCOUNTING_SCOPE } from './models';

const QUICKBOOKS_AUTHORIZATION_ENDPOINT = 'https://appcenter.intuit.com/connect/oauth2';
const QUICKBOOKS_TOKEN_ENDPOINT = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QUICKBOOKS_REVOCATION_ENDPOINT = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
const QUICKBOOKS_SANDBOX_API_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com';
const QUICKBOOKS_PRODUCTION_API_BASE_URL = 'https://quickbooks.api.intuit.com';
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const DEFAULT_MINOR_VERSION = '75';
const QUICKBOOKS_MAX_RETRIES = 2;

const QuickBooksTokenResponseSchema = z.object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    expires_in: z.number().int().positive(),
    x_refresh_token_expires_in: z.number().int().positive().optional(),
    token_type: z.string().min(1).default('bearer'),
});

const QuickBooksCompanyInfoResponseSchema = z
    .object({
        CompanyInfo: z
            .object({
                Id: z.string().optional(),
                CompanyName: z.string().optional(),
                LegalName: z.string().optional(),
            })
            .passthrough()
            .optional(),
    })
    .passthrough();

const QuickBooksQueryResponseSchema = z
    .object({
        QueryResponse: z.record(z.string(), z.unknown()).optional(),
        time: z.string().optional(),
    })
    .passthrough();

const QuickBooksCdcResponseSchema = z
    .object({
        CDCResponse: z.array(z.unknown()).optional(),
        time: z.string().optional(),
    })
    .passthrough();

export type QuickBooksTokenResponse = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshTokenExpiresIn: number | null;
    tokenType: string;
};

export type QuickBooksConfigurationStatus = {
    configured: boolean;
    missing: string[];
    environment: 'sandbox' | 'production';
    redirectUri: string | null;
    apiBaseUrl: string;
    minorVersion: string;
};

export type QuickBooksEntityName = 'Account' | 'Vendor';

export type QuickBooksCdcResponse = {
    rowsByEntity: Partial<Record<QuickBooksEntityName, Array<Record<string, unknown>>>>;
    responseTime: string;
};

type QuickBooksConfig = QuickBooksConfigurationStatus & {
    configured: true;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
};

type QuickBooksCompanyInfo = {
    id: string | null;
    name: string | null;
};

const isProductionEnvironment = (value: string | undefined): boolean =>
    value?.trim().toLowerCase() === 'production';

const getApiBaseUrl = (environment: 'sandbox' | 'production') =>
    environment === 'production'
        ? QUICKBOOKS_PRODUCTION_API_BASE_URL
        : QUICKBOOKS_SANDBOX_API_BASE_URL;

export const getFrontendUrl = () =>
    (process.env.CLIENT_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');

export const getQuickBooksConfigurationStatus = (): QuickBooksConfigurationStatus => {
    const environment = isProductionEnvironment(process.env.QUICKBOOKS_ENVIRONMENT)
        ? 'production'
        : 'sandbox';
    const requiredConfig = [
        { name: 'QUICKBOOKS_CLIENT_ID', value: process.env.QUICKBOOKS_CLIENT_ID },
        { name: 'QUICKBOOKS_CLIENT_SECRET', value: process.env.QUICKBOOKS_CLIENT_SECRET },
        { name: 'QUICKBOOKS_REDIRECT_URI', value: process.env.QUICKBOOKS_REDIRECT_URI },
    ];
    const missing = requiredConfig
        .filter(({ value }) => !value || !value.trim())
        .map(({ name }) => name);

    return {
        configured: missing.length === 0,
        missing,
        environment,
        redirectUri: process.env.QUICKBOOKS_REDIRECT_URI?.trim() || null,
        apiBaseUrl: getApiBaseUrl(environment),
        minorVersion: process.env.QUICKBOOKS_MINOR_VERSION?.trim() || DEFAULT_MINOR_VERSION,
    };
};

export const getQuickBooksConfig = (): QuickBooksConfig => {
    const status = getQuickBooksConfigurationStatus();

    if (!status.configured) {
        throw new BadRequestError(
            `QuickBooks is missing configuration: ${status.missing.join(', ')}`
        );
    }

    return {
        ...status,
        configured: true,
        clientId: process.env.QUICKBOOKS_CLIENT_ID!.trim(),
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!.trim(),
        redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!.trim(),
    };
};

const getBasicAuthorization = (config: Pick<QuickBooksConfig, 'clientId' | 'clientSecret'>) =>
    `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;

const toTokenResponse = (data: unknown): QuickBooksTokenResponse => {
    const parsed = QuickBooksTokenResponseSchema.parse(data);

    return {
        accessToken: parsed.access_token,
        refreshToken: parsed.refresh_token,
        expiresIn: parsed.expires_in,
        refreshTokenExpiresIn: parsed.x_refresh_token_expires_in ?? null,
        tokenType: parsed.token_type,
    };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getFaultMessage = (data: unknown): string | null => {
    if (!isRecord(data)) return null;
    const fault = data.Fault;
    if (!isRecord(fault)) return null;
    const errors = fault.Error;
    if (!Array.isArray(errors)) return null;
    const first = errors.find(isRecord);
    if (!first) return null;

    const message = typeof first.Message === 'string' ? first.Message : null;
    const detail = typeof first.Detail === 'string' ? first.Detail : null;

    return [message, detail].filter(Boolean).join(': ') || null;
};

const getRetryAfterMs = (value: unknown): number => {
    if (typeof value !== 'string') return 1000;
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000;
};

const requestWithRateLimitRetry = async <T>(request: () => Promise<T>): Promise<T> => {
    let attempt = 0;

    while (true) {
        try {
            return await request();
        } catch (error) {
            if (!axios.isAxiosError(error) || error.response?.status !== 429) throw error;
            if (attempt >= QUICKBOOKS_MAX_RETRIES) throw error;

            attempt += 1;
            await sleep(getRetryAfterMs(error.response.headers?.['retry-after']));
        }
    }
};

export const getQuickBooksClientErrorMessage = (error: unknown): string | null => {
    if (!axios.isAxiosError(error)) return null;

    return (
        getFaultMessage(error.response?.data) ??
        (typeof error.response?.data === 'string' ? error.response.data : null) ??
        error.message
    );
};

export const isQuickBooksAuthError = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) return false;
    const status = error.response?.status;
    if (status === 401) return true;
    if (status === 400) {
        const data = error.response?.data;
        if (isRecord(data) && typeof data.error === 'string') {
            return data.error === 'invalid_grant' || data.error === 'invalid_client';
        }
    }
    return false;
};

const extractCdcRows = (data: unknown, entities: QuickBooksEntityName[]): QuickBooksCdcResponse => {
    const parsed = QuickBooksCdcResponseSchema.parse(data);
    const rowsByEntity: Partial<Record<QuickBooksEntityName, Array<Record<string, unknown>>>> = {};

    for (const entity of entities) rowsByEntity[entity] = [];

    for (const cdcEntry of parsed.CDCResponse ?? []) {
        if (!isRecord(cdcEntry)) continue;
        const queryResponses = cdcEntry.QueryResponse;
        const responseList = Array.isArray(queryResponses) ? queryResponses : [queryResponses];

        for (const response of responseList) {
            if (!isRecord(response)) continue;

            for (const entity of entities) {
                const rows = response[entity];
                if (Array.isArray(rows)) rowsByEntity[entity]!.push(...rows.filter(isRecord));
            }
        }
    }

    return {
        rowsByEntity,
        responseTime: parsed.time ?? new Date().toISOString(),
    };
};

export const QuickBooksClient = {
    createAuthorizationUrl: (state: string): string => {
        const config = getQuickBooksConfig();
        const url = new URL(QUICKBOOKS_AUTHORIZATION_ENDPOINT);

        url.searchParams.set('client_id', config.clientId);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', QUICKBOOKS_ACCOUNTING_SCOPE);
        url.searchParams.set('redirect_uri', config.redirectUri);
        url.searchParams.set('state', state);

        return url.toString();
    },

    exchangeAuthorizationCode: async (code: string): Promise<QuickBooksTokenResponse> => {
        const config = getQuickBooksConfig();
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.redirectUri,
        });

        const response = await axios.post(QUICKBOOKS_TOKEN_ENDPOINT, body, {
            headers: {
                accept: 'application/json',
                authorization: getBasicAuthorization(config),
                'content-type': 'application/x-www-form-urlencoded',
            },
        });

        return toTokenResponse(response.data);
    },

    refreshToken: async (refreshToken: string): Promise<QuickBooksTokenResponse> => {
        const config = getQuickBooksConfig();
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });

        const response = await axios.post(QUICKBOOKS_TOKEN_ENDPOINT, body, {
            headers: {
                accept: 'application/json',
                authorization: getBasicAuthorization(config),
                'content-type': 'application/x-www-form-urlencoded',
            },
        });

        return toTokenResponse(response.data);
    },

    revokeToken: async (token: string): Promise<void> => {
        const config = getQuickBooksConfig();

        await axios.post(
            QUICKBOOKS_REVOCATION_ENDPOINT,
            { token },
            {
                headers: {
                    accept: 'application/json',
                    authorization: getBasicAuthorization(config),
                    'content-type': 'application/json',
                },
            }
        );
    },

    getCompanyInfo: async (
        realmId: string,
        accessToken: string
    ): Promise<QuickBooksCompanyInfo> => {
        const config = getQuickBooksConfig();
        const response = await requestWithRateLimitRetry(() =>
            axios.get(
                `${config.apiBaseUrl}/v3/company/${encodeURIComponent(realmId)}/companyinfo/${encodeURIComponent(
                    realmId
                )}`,
                {
                    headers: {
                        accept: 'application/json',
                        authorization: `Bearer ${accessToken}`,
                    },
                    params: { minorversion: config.minorVersion },
                }
            )
        );
        const parsed = QuickBooksCompanyInfoResponseSchema.parse(response.data);
        const company = parsed.CompanyInfo;

        return {
            id: company?.Id ?? null,
            name: company?.CompanyName ?? company?.LegalName ?? null,
        };
    },

    queryEntity: async (
        realmId: string,
        accessToken: string,
        entity: QuickBooksEntityName,
        query: string
    ): Promise<Array<Record<string, unknown>>> => {
        const config = getQuickBooksConfig();
        const response = await requestWithRateLimitRetry(() =>
            axios.get(`${config.apiBaseUrl}/v3/company/${encodeURIComponent(realmId)}/query`, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${accessToken}`,
                },
                params: {
                    query,
                    minorversion: config.minorVersion,
                },
            })
        );
        const parsed = QuickBooksQueryResponseSchema.parse(response.data);
        const rows = parsed.QueryResponse?.[entity];

        return Array.isArray(rows) ? rows.filter(isRecord) : [];
    },

    changeDataCapture: async (
        realmId: string,
        accessToken: string,
        entities: QuickBooksEntityName[],
        changedSince: Date
    ): Promise<QuickBooksCdcResponse> => {
        const config = getQuickBooksConfig();
        const response = await requestWithRateLimitRetry(() =>
            axios.get(`${config.apiBaseUrl}/v3/company/${encodeURIComponent(realmId)}/cdc`, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${accessToken}`,
                },
                params: {
                    entities: entities.join(','),
                    changedSince: changedSince.toISOString(),
                    minorversion: config.minorVersion,
                },
            })
        );

        return extractCdcRows(response.data, entities);
    },
};
