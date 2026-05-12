import { randomBytes } from 'node:crypto';

import { prisma } from '@lib/prisma';
import { BadRequestError, NotFoundError } from '@utils';
import { ulid } from 'ulid';

import {
    QUICKBOOKS_ACCOUNTING_SCOPE,
    QUICKBOOKS_DEFAULT_TRANSACTION_ENTITIES,
    QuickBooksCallbackQuery,
    QuickBooksDisconnectCallbackQuery,
    QuickBooksTransactionEntity,
    QuickBooksTransactionEntitySchema,
    QuickBooksTransactionPreview,
    QuickBooksTransactionsQuery,
} from './models';
import {
    getFrontendUrl,
    getQuickBooksClientErrorMessage,
    getQuickBooksConfig,
    getQuickBooksConfigurationStatus,
    isQuickBooksAuthError,
    QuickBooksClient,
    QuickBooksTokenResponse,
} from './quickbooks-client';
import { decryptQuickBooksToken, encryptQuickBooksToken } from './quickbooks-crypto';

import type { QuickBooksConnection } from '@db/client';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_WARNING_MS = 14 * 24 * 60 * 60 * 1000;
const QUICKBOOKS_ENTITY_SET = new Set<string>(QuickBooksTransactionEntitySchema.options);

type QuickBooksTokenHealth = 'healthy' | 'expiring' | 'expired' | 'unknown';

type QuickBooksStatusConnection = {
    id: string;
    realmId: string;
    companyName: string | null;
    environment: 'sandbox' | 'production';
    status: 'CONNECTED' | 'DISCONNECTED';
    scope: string;
    connectedById: string | null;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string | null;
    tokenHealth: QuickBooksTokenHealth;
    lastSyncedAt: string | null;
    disconnectedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type QuickBooksStatus = {
    configured: boolean;
    missingConfig: string[];
    environment: 'sandbox' | 'production';
    redirectUri: string | null;
    apiBaseUrl: string;
    minorVersion: string;
    connection: QuickBooksStatusConnection | null;
};

type QuickBooksAuthorizationResponse = {
    authorizationUrl: string;
    scope: string;
    environment: 'sandbox' | 'production';
    expiresAt: string;
};

type QuickBooksCallbackResponse = {
    redirectUrl: string;
};

type QuickBooksTransactionsResponse = {
    realmId: string;
    companyName: string | null;
    environment: 'sandbox' | 'production';
    fetchedAt: string;
    entities: QuickBooksTransactionEntity[];
    transactions: QuickBooksTransactionPreview[];
};

type QuickBooksTransactionResponse = {
    realmId: string;
    companyName: string | null;
    environment: 'sandbox' | 'production';
    transaction: QuickBooksTransactionPreview;
};

type QuickBooksDisconnectResponse = {
    disconnected: boolean;
};

type QuickBooksDisconnectCallbackResponse = {
    redirectUrl: string;
};

const addSeconds = (date: Date, seconds: number): Date => new Date(date.getTime() + seconds * 1000);

const toEnvironment = (value: QuickBooksConnection['environment']): 'sandbox' | 'production' =>
    value === 'PRODUCTION' ? 'production' : 'sandbox';

const toConnectionStatus = (value: QuickBooksConnection['status']): 'CONNECTED' | 'DISCONNECTED' =>
    value === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED';

const getTokenHealth = (connection: QuickBooksConnection): QuickBooksTokenHealth => {
    if (connection.status !== 'CONNECTED') return 'unknown';
    if (!connection.refreshTokenExpiresAt) return 'unknown';

    const now = Date.now();
    const expiresAt = connection.refreshTokenExpiresAt.getTime();

    if (expiresAt <= now) return 'expired';
    if (expiresAt - now <= REFRESH_TOKEN_EXPIRY_WARNING_MS) return 'expiring';

    return 'healthy';
};

const toStatusConnection = (connection: QuickBooksConnection): QuickBooksStatusConnection => ({
    id: connection.id,
    realmId: connection.realmId,
    companyName: connection.companyName,
    environment: toEnvironment(connection.environment),
    status: toConnectionStatus(connection.status),
    scope: connection.scope,
    connectedById: connection.connectedById,
    accessTokenExpiresAt: connection.accessTokenExpiresAt.toISOString(),
    refreshTokenExpiresAt: connection.refreshTokenExpiresAt?.toISOString() ?? null,
    tokenHealth: getTokenHealth(connection),
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    disconnectedAt: connection.disconnectedAt?.toISOString() ?? null,
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
});

const getActiveConnection = async (): Promise<QuickBooksConnection | null> => {
    return await prisma.quickBooksConnection.findFirst({
        where: {
            status: 'CONNECTED',
            disconnectedAt: null,
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });
};

const getRequiredActiveConnection = async (): Promise<QuickBooksConnection> => {
    const connection = await getActiveConnection();

    if (!connection) {
        throw new NotFoundError('QuickBooks is not connected');
    }

    return connection;
};

const buildFrontendRedirect = (params: Record<string, string>): string => {
    const url = new URL('/app/integrations/quickbooks', getFrontendUrl());

    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    return url.toString();
};

const buildPublicRedirect = (path: string, params: Record<string, string> = {}): string => {
    const url = new URL(path, getFrontendUrl());

    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    return url.toString();
};

const markConnectionDisconnected = async (connectionId: string): Promise<void> => {
    await prisma.quickBooksConnection.update({
        where: { id: connectionId },
        data: {
            status: 'DISCONNECTED',
            accessToken: '',
            refreshToken: '',
            accessTokenExpiresAt: new Date(0),
            refreshTokenExpiresAt: null,
            disconnectedAt: new Date(),
        },
    });
};

const storeTokenResponse = async (
    connectionId: string,
    token: QuickBooksTokenResponse,
    now = new Date()
): Promise<void> => {
    await prisma.quickBooksConnection.update({
        where: { id: connectionId },
        data: {
            accessToken: encryptQuickBooksToken(token.accessToken),
            refreshToken: encryptQuickBooksToken(token.refreshToken),
            tokenType: token.tokenType,
            accessTokenExpiresAt: addSeconds(now, token.expiresIn),
            refreshTokenExpiresAt: token.refreshTokenExpiresIn
                ? addSeconds(now, token.refreshTokenExpiresIn)
                : undefined,
        },
    });
};

const getValidAccessToken = async (connectionId: string): Promise<string> => {
    const connection = await prisma.quickBooksConnection.findUnique({
        where: { id: connectionId },
    });
    if (!connection || connection.status !== 'CONNECTED') {
        throw new NotFoundError('QuickBooks is not connected');
    }

    const refreshAt = connection.accessTokenExpiresAt.getTime() - ACCESS_TOKEN_REFRESH_WINDOW_MS;
    if (refreshAt > Date.now()) {
        return decryptQuickBooksToken(connection.accessToken);
    }

    try {
        const token = await QuickBooksClient.refreshToken(
            decryptQuickBooksToken(connection.refreshToken)
        );
        await storeTokenResponse(connection.id, token);

        return token.accessToken;
    } catch (error) {
        if (isQuickBooksAuthError(error)) {
            await markConnectionDisconnected(connection.id);
            throw new BadRequestError(
                'QuickBooks authorization has been revoked. Please reconnect.'
            );
        }

        const message = getQuickBooksClientErrorMessage(error);
        if (message) {
            throw new BadRequestError(`QuickBooks token refresh failed: ${message}`);
        }

        throw error;
    }
};

const getRequestedEntities = (entities?: string): QuickBooksTransactionEntity[] => {
    if (!entities) return QUICKBOOKS_DEFAULT_TRANSACTION_ENTITIES;

    const requested = entities
        .split(',')
        .map((entity) => entity.trim())
        .filter(Boolean);

    if (requested.length === 0) return QUICKBOOKS_DEFAULT_TRANSACTION_ENTITIES;

    const invalid = requested.filter((entity) => !QUICKBOOKS_ENTITY_SET.has(entity));
    if (invalid.length > 0) {
        throw new BadRequestError(
            `Unsupported QuickBooks transaction entity: ${invalid.join(', ')}`
        );
    }

    return requested.map((entity) => QuickBooksTransactionEntitySchema.parse(entity));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringValue = (record: Record<string, unknown>, key: string): string | null => {
    const value = record[key];
    return typeof value === 'string' && value.trim() ? value : null;
};

const getNumberValue = (record: Record<string, unknown>, key: string): number | null => {
    const value = record[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

const getRecordValue = (
    record: Record<string, unknown>,
    key: string
): Record<string, unknown> | null => {
    const value = record[key];
    return isRecord(value) ? value : null;
};

const getRefName = (record: Record<string, unknown>, key: string): string | null => {
    const ref = getRecordValue(record, key);
    if (!ref) return null;

    return getStringValue(ref, 'name') ?? getStringValue(ref, 'value');
};

const getLastUpdatedTime = (record: Record<string, unknown>): string | null => {
    const metadata = getRecordValue(record, 'MetaData') ?? getRecordValue(record, 'Metadata');
    return metadata ? getStringValue(metadata, 'LastUpdatedTime') : null;
};

const getCurrency = (record: Record<string, unknown>): string | null => {
    const currencyRef = getRecordValue(record, 'CurrencyRef');
    return currencyRef ? getStringValue(currencyRef, 'value') : null;
};

const getDisplayName = (
    entity: QuickBooksTransactionEntity,
    record: Record<string, unknown>
): string => {
    return (
        getRefName(record, 'CustomerRef') ??
        getRefName(record, 'VendorRef') ??
        getRefName(record, 'AccountRef') ??
        getStringValue(record, 'DocNumber') ??
        `${entity} ${getStringValue(record, 'Id') ?? ''}`.trim()
    );
};

const normalizeTransaction = (
    entity: QuickBooksTransactionEntity,
    record: Record<string, unknown>
): QuickBooksTransactionPreview => ({
    entity,
    id: getStringValue(record, 'Id') ?? '',
    docNumber: getStringValue(record, 'DocNumber'),
    txnDate: getStringValue(record, 'TxnDate'),
    displayName: getDisplayName(entity, record),
    totalAmount: getNumberValue(record, 'TotalAmt') ?? getNumberValue(record, 'Amount'),
    currency: getCurrency(record),
    privateNote: getStringValue(record, 'PrivateNote') ?? getStringValue(record, 'Memo'),
    lastUpdatedTime: getLastUpdatedTime(record),
    raw: record,
});

const compareTransactions = (
    a: QuickBooksTransactionPreview,
    b: QuickBooksTransactionPreview
): number => {
    const aDate = a.lastUpdatedTime ?? a.txnDate ?? '';
    const bDate = b.lastUpdatedTime ?? b.txnDate ?? '';

    return bDate.localeCompare(aDate);
};

const getSafeQuickBooksId = (value: string): string => {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new BadRequestError('Invalid QuickBooks transaction id');
    }
    return value;
};

export const QuickBooksService = {
    getStatus: async (): Promise<QuickBooksStatus> => {
        const config = getQuickBooksConfigurationStatus();
        const connection = await getActiveConnection();

        return {
            configured: config.configured,
            missingConfig: config.missing,
            environment: config.environment,
            redirectUri: config.redirectUri,
            apiBaseUrl: config.apiBaseUrl,
            minorVersion: config.minorVersion,
            connection: connection ? toStatusConnection(connection) : null,
        };
    },

    createAuthorizationUrl: async (userId: string): Promise<QuickBooksAuthorizationResponse> => {
        const config = getQuickBooksConfig();
        const state = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);

        await prisma.quickBooksOAuthState.deleteMany({
            where: {
                OR: [{ userId }, { expiresAt: { lt: new Date() } }],
            },
        });

        await prisma.quickBooksOAuthState.create({
            data: {
                id: ulid(),
                state,
                userId,
                redirectTo: buildFrontendRedirect({}),
                expiresAt,
            },
        });

        return {
            authorizationUrl: QuickBooksClient.createAuthorizationUrl(state),
            scope: QUICKBOOKS_ACCOUNTING_SCOPE,
            environment: config.environment,
            expiresAt: expiresAt.toISOString(),
        };
    },

    handleCallback: async (query: QuickBooksCallbackQuery): Promise<QuickBooksCallbackResponse> => {
        if (query.error) {
            return {
                redirectUrl: buildFrontendRedirect({
                    quickbooks: 'error',
                    reason: query.error_description ?? query.error,
                }),
            };
        }

        if (!query.code || !query.realmId) {
            return {
                redirectUrl: buildFrontendRedirect({
                    quickbooks: 'error',
                    reason: 'missing_authorization_response',
                }),
            };
        }

        const oauthState = await prisma.quickBooksOAuthState.findUnique({
            where: { state: query.state },
        });

        if (!oauthState || oauthState.expiresAt < new Date()) {
            return {
                redirectUrl: buildFrontendRedirect({
                    quickbooks: 'error',
                    reason: 'invalid_state',
                }),
            };
        }

        const userId = oauthState.userId;

        await prisma.quickBooksOAuthState.delete({ where: { state: query.state } });

        try {
            const config = getQuickBooksConfig();
            const now = new Date();
            const token = await QuickBooksClient.exchangeAuthorizationCode(query.code);
            let companyName: string | null = null;

            try {
                const company = await QuickBooksClient.getCompanyInfo(
                    query.realmId,
                    token.accessToken
                );
                companyName = company.name;
            } catch {
                companyName = null;
            }

            // Disconnect any other active connections (single-connection enforcement)
            const otherConnections = await prisma.quickBooksConnection.findMany({
                where: {
                    status: 'CONNECTED',
                    realmId: { not: query.realmId },
                },
            });

            for (const other of otherConnections) {
                try {
                    await QuickBooksClient.revokeToken(decryptQuickBooksToken(other.refreshToken));
                } catch {
                    // Best effort — token may already be invalid
                }
                await markConnectionDisconnected(other.id);
            }

            await prisma.quickBooksConnection.upsert({
                where: { realmId: query.realmId },
                update: {
                    companyName,
                    environment: config.environment === 'production' ? 'PRODUCTION' : 'SANDBOX',
                    status: 'CONNECTED',
                    scope: QUICKBOOKS_ACCOUNTING_SCOPE,
                    accessToken: encryptQuickBooksToken(token.accessToken),
                    refreshToken: encryptQuickBooksToken(token.refreshToken),
                    tokenType: token.tokenType,
                    accessTokenExpiresAt: addSeconds(now, token.expiresIn),
                    refreshTokenExpiresAt: token.refreshTokenExpiresIn
                        ? addSeconds(now, token.refreshTokenExpiresIn)
                        : null,
                    connectedById: userId,
                    disconnectedAt: null,
                },
                create: {
                    id: ulid(),
                    realmId: query.realmId,
                    companyName,
                    environment: config.environment === 'production' ? 'PRODUCTION' : 'SANDBOX',
                    status: 'CONNECTED',
                    scope: QUICKBOOKS_ACCOUNTING_SCOPE,
                    accessToken: encryptQuickBooksToken(token.accessToken),
                    refreshToken: encryptQuickBooksToken(token.refreshToken),
                    tokenType: token.tokenType,
                    accessTokenExpiresAt: addSeconds(now, token.expiresIn),
                    refreshTokenExpiresAt: token.refreshTokenExpiresIn
                        ? addSeconds(now, token.refreshTokenExpiresIn)
                        : null,
                    connectedById: userId,
                },
            });

            return {
                redirectUrl: buildFrontendRedirect({
                    quickbooks: 'connected',
                    realmId: query.realmId,
                }),
            };
        } catch (error) {
            const message = getQuickBooksClientErrorMessage(error) ?? 'connection_failed';
            return {
                redirectUrl: buildFrontendRedirect({
                    quickbooks: 'error',
                    reason: message,
                }),
            };
        }
    },

    disconnect: async (): Promise<QuickBooksDisconnectResponse> => {
        const connection = await getActiveConnection();

        if (!connection) {
            return { disconnected: false };
        }

        try {
            await QuickBooksClient.revokeToken(decryptQuickBooksToken(connection.refreshToken));
        } catch {
            // Best effort — token may already be revoked, expired, or invalid.
            // We always proceed with local cleanup regardless.
        }

        await markConnectionDisconnected(connection.id);

        return { disconnected: true };
    },

    handleDisconnectCallback: async (
        query: QuickBooksDisconnectCallbackQuery
    ): Promise<QuickBooksDisconnectCallbackResponse> => {
        const connection = await prisma.quickBooksConnection.findUnique({
            where: { realmId: query.realmId },
        });

        if (connection && connection.status === 'CONNECTED') {
            await markConnectionDisconnected(connection.id);
        }

        return {
            redirectUrl: buildPublicRedirect('/quickbooks/disconnected', {
                realmId: query.realmId,
            }),
        };
    },

    getTransactions: async (
        query: QuickBooksTransactionsQuery
    ): Promise<QuickBooksTransactionsResponse> => {
        const connection = await getRequiredActiveConnection();
        const entities = getRequestedEntities(query.entities);
        const accessToken = await getValidAccessToken(connection.id);
        const transactions: QuickBooksTransactionPreview[] = [];

        try {
            for (const entity of entities) {
                const select = `SELECT * FROM ${entity} ORDERBY MetaData.LastUpdatedTime DESC STARTPOSITION 1 MAXRESULTS ${query.maxResults}`;
                const rows = await QuickBooksClient.queryEntity(
                    connection.realmId,
                    accessToken,
                    entity,
                    select
                );
                transactions.push(...rows.map((row) => normalizeTransaction(entity, row)));
            }
        } catch (error) {
            const message = getQuickBooksClientErrorMessage(error);
            if (message) {
                throw new BadRequestError(`QuickBooks transaction sync failed: ${message}`);
            }

            throw error;
        }

        await prisma.quickBooksConnection.update({
            where: { id: connection.id },
            data: { lastSyncedAt: new Date() },
        });

        return {
            realmId: connection.realmId,
            companyName: connection.companyName,
            environment: toEnvironment(connection.environment),
            fetchedAt: new Date().toISOString(),
            entities,
            transactions: transactions.sort(compareTransactions),
        };
    },

    getTransactionById: async (
        entity: QuickBooksTransactionEntity,
        transactionId: string,
        realmId?: string
    ): Promise<QuickBooksTransactionResponse> => {
        const connection = await getRequiredActiveConnection();

        if (realmId && connection.realmId !== realmId) {
            throw new BadRequestError('QuickBooks transaction belongs to a different company');
        }

        const accessToken = await getValidAccessToken(connection.id);
        const safeId = getSafeQuickBooksId(transactionId);

        try {
            const rows = await QuickBooksClient.queryEntity(
                connection.realmId,
                accessToken,
                entity,
                `SELECT * FROM ${entity} WHERE Id = '${safeId}'`
            );
            const record = rows[0];
            if (!record) {
                throw new NotFoundError('QuickBooks transaction not found');
            }

            await prisma.quickBooksConnection.update({
                where: { id: connection.id },
                data: { lastSyncedAt: new Date() },
            });

            return {
                realmId: connection.realmId,
                companyName: connection.companyName,
                environment: toEnvironment(connection.environment),
                transaction: normalizeTransaction(entity, record),
            };
        } catch (error) {
            const message = getQuickBooksClientErrorMessage(error);
            if (message)
                throw new BadRequestError(`QuickBooks transaction lookup failed: ${message}`);
            throw error;
        }
    },
};
