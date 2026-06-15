import { randomBytes } from 'node:crypto';

import { Prisma } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log/service';
import { BadRequestError, ConflictError, NotFoundError } from '@utils/error';
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
import {
    getValidQuickBooksAccessToken,
    markQuickBooksConnectionDisconnected,
} from './quickbooks-token-helper';
import { QuickBooksReferenceSyncService } from './reference-sync-service';

import type { QuickBooksPurchaseResponse, QuickBooksVendorResponse } from './quickbooks-client';
import type { QuickBooksConnection, QuickBooksPayee } from '@db/client';
import type { TransactionClient } from '@db/internal/prismaNamespace';

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

type QuickBooksPayeeOption = {
    id: string;
    realmId: string;
    qbId: string;
    displayName: string;
    companyName: string | null;
    primaryEmail: string | null;
    primaryPhone: string | null;
    active: boolean | null;
    deletedAt: string | null;
};

type QuickBooksVendorMappingResult = {
    id: string;
    vendorId: string;
    realmId: string;
    quickBooksPayeeId: string;
    qbVendorId: string;
    displayName: string;
    companyName: string | null;
    primaryEmail: string | null;
    primaryPhone: string | null;
};

type PreparedVendorMapping = {
    connectionId: string;
    realmId: string;
    vendorId: string;
    quickBooksPayeeId: string;
    quickBooksId: string;
    vendorName: string;
    displayName: string;
};

const addSeconds = (date: Date, seconds: number): Date => new Date(date.getTime() + seconds * 1000);

const toEnvironment = (value: QuickBooksConnection['environment']): 'sandbox' | 'production' =>
    value === 'PRODUCTION' ? 'production' : 'sandbox';

const toConnectionStatus = (value: QuickBooksConnection['status']): 'CONNECTED' | 'DISCONNECTED' =>
    value === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (record: Record<string, unknown>, key: string): string | null => {
    const value = record[key];
    return typeof value === 'string' && value.trim() ? value : null;
};

const getBoolean = (record: Record<string, unknown>, key: string): boolean | null => {
    const value = record[key];
    return typeof value === 'boolean' ? value : null;
};

const getRecord = (
    record: Record<string, unknown>,
    key: string
): Record<string, unknown> | null => {
    const value = record[key];
    return isRecord(value) ? value : null;
};

const getNestedString = (
    record: Record<string, unknown>,
    key: string,
    nestedKey: string
): string | null => {
    const nested = getRecord(record, key);
    return nested ? getString(nested, nestedKey) : null;
};

const parseQuickBooksDate = (value: string | null): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
    JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const toPayeeOption = (row: QuickBooksPayee): QuickBooksPayeeOption => ({
    id: row.id,
    realmId: row.realmId,
    qbId: row.quickBooksId,
    displayName: row.displayName,
    companyName: row.companyName,
    primaryEmail: row.primaryEmail,
    primaryPhone: row.primaryPhone,
    active: row.active,
    deletedAt: row.deletedAt?.toISOString() ?? null,
});

const toMappingResult = (mapping: {
    id: string;
    vendorId: string;
    realmId: string;
    quickBooksPayeeId: string;
    quickBooksId: string;
    quickBooksPayee: Pick<
        QuickBooksPayee,
        'displayName' | 'companyName' | 'primaryEmail' | 'primaryPhone'
    >;
}): QuickBooksVendorMappingResult => ({
    id: mapping.id,
    vendorId: mapping.vendorId,
    realmId: mapping.realmId,
    quickBooksPayeeId: mapping.quickBooksPayeeId,
    qbVendorId: mapping.quickBooksId,
    displayName: mapping.quickBooksPayee.displayName,
    companyName: mapping.quickBooksPayee.companyName,
    primaryEmail: mapping.quickBooksPayee.primaryEmail,
    primaryPhone: mapping.quickBooksPayee.primaryPhone,
});

const getPayeeDataFromVendorResponse = (
    connection: QuickBooksConnection,
    response: QuickBooksVendorResponse,
    fallback: {
        displayName: string;
        companyName?: string | null;
        primaryEmail?: string | null;
        primaryPhone?: string | null;
    }
) => {
    const vendor = response.Vendor as Record<string, unknown>;
    const metadata = getRecord(vendor, 'MetaData') ?? getRecord(vendor, 'Metadata');
    const displayName =
        getString(vendor, 'DisplayName') ??
        getString(vendor, 'CompanyName') ??
        fallback.displayName.trim();
    const companyName = getString(vendor, 'CompanyName') ?? fallback.companyName?.trim() ?? null;

    return {
        connectionId: connection.id,
        realmId: connection.realmId,
        quickBooksId: response.Vendor.Id,
        displayName,
        companyName,
        givenName: getString(vendor, 'GivenName'),
        familyName: getString(vendor, 'FamilyName'),
        primaryEmail:
            getNestedString(vendor, 'PrimaryEmailAddr', 'Address') ??
            fallback.primaryEmail?.trim() ??
            null,
        primaryPhone:
            getNestedString(vendor, 'PrimaryPhone', 'FreeFormNumber') ??
            fallback.primaryPhone?.trim() ??
            null,
        active: getBoolean(vendor, 'Active') ?? true,
        syncToken: response.Vendor.SyncToken ?? null,
        quickBooksUpdatedAt: parseQuickBooksDate(
            metadata ? getString(metadata, 'LastUpdatedTime') : null
        ),
        deletedAt: null,
        raw: toJsonValue(response),
    };
};

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

const startInitialReferenceSync = (userId: string): void => {
    void QuickBooksReferenceSyncService.syncReferenceData({
        trigger: 'MANUAL',
        userId,
        requireAutoEnabled: true,
    }).catch((error) => {
        console.error('[quickbooks] initial reference sync failed:', error);
    });
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
                    referenceAutoSyncEnabled: true,
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
                    referenceAutoSyncEnabled: true,
                },
            });

            startInitialReferenceSync(userId);

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

    prepareVendorMapping: async (input: {
        vendorId: string;
        qbVendorId: string;
    }): Promise<PreparedVendorMapping> => {
        const connection = await getActiveConnection();
        if (!connection) throw new NotFoundError('QuickBooks is not connected');

        const [vendor, payee, conflictingMapping] = await Promise.all([
            prisma.vendor.findUnique({
                where: { id: input.vendorId },
                select: { id: true, name: true, deletedAt: true },
            }),
            prisma.quickBooksPayee.findUnique({
                where: {
                    realmId_quickBooksId: {
                        realmId: connection.realmId,
                        quickBooksId: input.qbVendorId,
                    },
                },
            }),
            prisma.quickBooksVendorMapping.findUnique({
                where: {
                    realmId_quickBooksId: {
                        realmId: connection.realmId,
                        quickBooksId: input.qbVendorId,
                    },
                },
                include: { vendor: { select: { id: true, name: true } } },
            }),
        ]);

        if (!vendor || vendor.deletedAt) throw new NotFoundError('Vendor not found.');
        if (!payee) throw new BadRequestError('Selected QuickBooks vendor was not found.');
        if (payee.deletedAt || payee.active === false) {
            throw new BadRequestError('Selected QuickBooks vendor is inactive.');
        }
        if (conflictingMapping && conflictingMapping.vendorId !== input.vendorId) {
            throw new ConflictError(
                `QuickBooks vendor ${payee.displayName} is already mapped to ${conflictingMapping.vendor.name}.`
            );
        }

        return {
            connectionId: connection.id,
            realmId: connection.realmId,
            vendorId: vendor.id,
            quickBooksPayeeId: payee.id,
            quickBooksId: payee.quickBooksId,
            vendorName: vendor.name,
            displayName: payee.displayName,
        };
    },

    savePreparedVendorMapping: async ({
        prepared,
        userId,
        tx,
    }: {
        prepared: PreparedVendorMapping;
        userId: string;
        tx?: TransactionClient;
    }): Promise<QuickBooksVendorMappingResult> => {
        const client = tx ?? prisma;
        const mapping = await client.quickBooksVendorMapping.upsert({
            where: {
                realmId_vendorId: {
                    realmId: prepared.realmId,
                    vendorId: prepared.vendorId,
                },
            },
            create: {
                id: generateNanoId(),
                connectionId: prepared.connectionId,
                realmId: prepared.realmId,
                vendorId: prepared.vendorId,
                quickBooksPayeeId: prepared.quickBooksPayeeId,
                quickBooksId: prepared.quickBooksId,
                createdById: userId,
                updatedById: userId,
            },
            update: {
                connectionId: prepared.connectionId,
                quickBooksPayeeId: prepared.quickBooksPayeeId,
                quickBooksId: prepared.quickBooksId,
                updatedById: userId,
            },
            include: {
                quickBooksPayee: {
                    select: {
                        displayName: true,
                        companyName: true,
                        primaryEmail: true,
                        primaryPhone: true,
                    },
                },
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'vendor',
            entityId: prepared.vendorId,
            action: 'link',
            description: `Mapped vendor ${prepared.vendorName} to QuickBooks vendor ${prepared.displayName}`,
            affectedEntityIds: [prepared.vendorId],
            tx,
        });

        return toMappingResult(mapping);
    },

    mapVendorToPayee: async (
        input: { vendorId: string; qbVendorId: string },
        userId: string
    ): Promise<QuickBooksVendorMappingResult> => {
        const prepared = await QuickBooksService.prepareVendorMapping(input);
        return QuickBooksService.savePreparedVendorMapping({ prepared, userId });
    },

    unmapVendorFromPayee: async (
        input: { vendorId: string },
        userId: string
    ): Promise<{ unmapped: boolean }> => {
        const connection = await getActiveConnection();
        if (!connection) throw new NotFoundError('QuickBooks is not connected');

        const mapping = await prisma.quickBooksVendorMapping.findUnique({
            where: {
                realmId_vendorId: {
                    realmId: connection.realmId,
                    vendorId: input.vendorId,
                },
            },
            include: {
                vendor: { select: { id: true, name: true, deletedAt: true } },
                quickBooksPayee: { select: { displayName: true } },
            },
        });

        if (!mapping) return { unmapped: false };
        if (!mapping.vendor || mapping.vendor.deletedAt)
            throw new NotFoundError('Vendor not found.');

        await prisma.$transaction(async (tx) => {
            await tx.quickBooksVendorMapping.delete({ where: { id: mapping.id } });
            await ActivityLogService.log({
                userId,
                entityType: 'vendor',
                entityId: mapping.vendorId,
                action: 'unlink',
                description: `Unmapped vendor ${mapping.vendor.name} from QuickBooks vendor ${mapping.quickBooksPayee.displayName}`,
                affectedEntityIds: [mapping.vendorId],
                tx,
            });
        });

        return { unmapped: true };
    },

    createVendor: async (
        input: {
            displayName: string;
            companyName?: string | null;
            primaryEmail?: string | null;
            primaryPhone?: string | null;
            vendorId?: string;
            saveMapping?: boolean;
        },
        userId: string
    ): Promise<{
        vendor: QuickBooksPayeeOption;
        mapping: QuickBooksVendorMappingResult | null;
    }> => {
        const connection = await getActiveConnection();
        if (!connection) throw new NotFoundError('QuickBooks is not connected');

        if (input.vendorId) {
            const vendor = await prisma.vendor.findUnique({
                where: { id: input.vendorId },
                select: { id: true, deletedAt: true },
            });
            if (!vendor || vendor.deletedAt) throw new NotFoundError('Vendor not found.');
        }

        const accessToken = await getValidQuickBooksAccessToken(connection);
        let created: Awaited<ReturnType<typeof QuickBooksClient.createVendor>>;

        try {
            created = await QuickBooksClient.createVendor(connection.realmId, accessToken, {
                displayName: input.displayName,
                companyName: input.companyName,
                primaryEmail: input.primaryEmail,
                primaryPhone: input.primaryPhone,
            });
        } catch (error) {
            const message = getQuickBooksClientErrorMessage(error);
            throw new BadRequestError(
                message
                    ? `QuickBooks vendor creation failed: ${message}`
                    : 'QuickBooks vendor creation failed.'
            );
        }

        const data = getPayeeDataFromVendorResponse(connection, created.response, input);
        const payee = await prisma.quickBooksPayee.upsert({
            where: {
                realmId_quickBooksId: {
                    realmId: connection.realmId,
                    quickBooksId: created.id,
                },
            },
            create: { ...data, id: generateNanoId() },
            update: data,
        });
        const mapping =
            input.saveMapping && input.vendorId
                ? await QuickBooksService.mapVendorToPayee(
                      { vendorId: input.vendorId, qbVendorId: payee.quickBooksId },
                      userId
                  )
                : null;

        if (input.vendorId) {
            await ActivityLogService.log({
                userId,
                entityType: 'vendor',
                entityId: input.vendorId,
                action: 'create',
                description: `Created QuickBooks vendor ${payee.displayName}`,
                affectedEntityIds: [input.vendorId],
            });
        }

        return { vendor: toPayeeOption(payee), mapping };
    },

    // Record a standalone vendor payment (Check) in QuickBooks against synced
    // vendor, bank account, and expense-category references.
    createVendorPurchase: async (input: {
        qbVendorId: string;
        bankAccountId: string;
        categoryId: string;
        amount: number;
        txnDate: Date;
        lineDescription: string;
        memo?: string;
    }): Promise<{
        transactionId: string;
        transactionUrl: string;
        quickBooksResponse: QuickBooksPurchaseResponse;
    }> => {
        const connection = await getActiveConnection();
        if (!connection) throw new NotFoundError('QuickBooks is not connected');

        const realmId = connection.realmId;
        const [vendor, bankAccount, category] = await Promise.all([
            prisma.quickBooksPayee.findUnique({
                where: { realmId_quickBooksId: { realmId, quickBooksId: input.qbVendorId } },
            }),
            prisma.quickBooksBankAccount.findUnique({
                where: { realmId_quickBooksId: { realmId, quickBooksId: input.bankAccountId } },
            }),
            prisma.quickBooksLineItemCategory.findUnique({
                where: { realmId_quickBooksId: { realmId, quickBooksId: input.categoryId } },
            }),
        ]);

        if (!vendor) throw new BadRequestError('Selected QuickBooks vendor was not found.');
        if (!bankAccount)
            throw new BadRequestError('Selected QuickBooks bank account was not found.');
        if (!category)
            throw new BadRequestError('Selected QuickBooks expense category was not found.');

        const accessToken = await getValidQuickBooksAccessToken(connection);

        try {
            const purchase = await QuickBooksClient.createPurchase(realmId, accessToken, {
                vendorQbId: input.qbVendorId,
                bankAccountQbId: input.bankAccountId,
                expenseAccountQbId: input.categoryId,
                amount: input.amount,
                txnDate: input.txnDate.toISOString().slice(0, 10),
                lineDescription: input.lineDescription,
                ...(input.memo ? { privateNote: input.memo } : {}),
            });

            return {
                transactionId: purchase.id,
                transactionUrl: purchase.url,
                quickBooksResponse: purchase.response,
            };
        } catch (error) {
            const message = getQuickBooksClientErrorMessage(error);
            throw new BadRequestError(
                message ? `QuickBooks payment failed: ${message}` : 'QuickBooks payment failed.'
            );
        }
    },
};
