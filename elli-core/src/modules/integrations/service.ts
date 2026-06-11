import { randomBytes } from 'node:crypto';

import { prisma } from '@lib/prisma';
import { generateNanoId } from '@utils/generateNanoId';

import {
    QUICKBOOKS_ACCOUNTING_SCOPE,
    QuickBooksCallbackQuery,
    QuickBooksDisconnectCallbackQuery,
} from './models';
import {
    getFrontendUrl,
    getQuickBooksClientErrorMessage,
    getQuickBooksConfig,
    getQuickBooksConfigurationStatus,
    QuickBooksClient,
} from './quickbooks-client';
import { decryptQuickBooksToken, encryptQuickBooksToken } from './quickbooks-crypto';
import { markQuickBooksConnectionDisconnected } from './quickbooks-token-helper';

import type { QuickBooksConnection } from '@db/client';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_WARNING_MS = 14 * 24 * 60 * 60 * 1000;
const QUICKBOOKS_SETTINGS_PATH = '/app/settings/integrations';

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

const buildFrontendRedirect = (params: Record<string, string>): string => {
    const url = new URL(QUICKBOOKS_SETTINGS_PATH, getFrontendUrl());

    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    return url.toString();
};

const buildPublicRedirect = (path: string, params: Record<string, string> = {}): string => {
    const url = new URL(path, getFrontendUrl());

    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    return url.toString();
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
                id: generateNanoId(),
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
                    // Best effort: the Intuit token may already be invalid.
                }
                await markQuickBooksConnectionDisconnected(other.id);
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
                    id: generateNanoId(),
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
            // Always clean up local state even if Intuit rejects the revocation request.
        }

        await markQuickBooksConnectionDisconnected(connection.id);

        return { disconnected: true };
    },

    handleDisconnectCallback: async (
        query: QuickBooksDisconnectCallbackQuery
    ): Promise<QuickBooksDisconnectCallbackResponse> => {
        const connection = await prisma.quickBooksConnection.findUnique({
            where: { realmId: query.realmId },
        });

        if (connection && connection.status === 'CONNECTED') {
            await markQuickBooksConnectionDisconnected(connection.id);
        }

        return {
            redirectUrl: buildPublicRedirect('/quickbooks/disconnected', {
                realmId: query.realmId,
            }),
        };
    },
};
