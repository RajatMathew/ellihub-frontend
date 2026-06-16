import { Prisma } from '@db/client';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

type MockFn = ReturnType<typeof mock>;
type PublicRouteApp = {
    request: (input: string) => Promise<Response>;
};

const axiosMock = {
    get: mock(),
    post: mock(),
    isAxiosError: (error: unknown) =>
        Boolean(
            error && typeof error === 'object' && (error as { isAxiosError?: boolean }).isAxiosError
        ),
};

const idMock = mock(() => 'generated-id');

const prismaMock = {
    $transaction: mock(async (callback: (tx: typeof prismaMock) => unknown) =>
        callback(prismaMock)
    ),
    quickBooksConnection: {
        findFirst: mock(),
        findMany: mock(),
        findUnique: mock(),
        upsert: mock(),
        update: mock(),
    },
    quickBooksOAuthState: {
        deleteMany: mock(),
        create: mock(),
        findUnique: mock(),
        delete: mock(),
    },
    quickBooksReferenceSyncState: {
        findUnique: mock(),
        findMany: mock(),
        upsert: mock(),
    },
    quickBooksReferenceSyncLock: {
        deleteMany: mock(),
        create: mock(),
    },
    quickBooksBankAccount: {
        findUnique: mock(),
        findMany: mock(),
        create: mock(),
        update: mock(),
    },
    quickBooksLineItemCategory: {
        findUnique: mock(),
        findMany: mock(),
        create: mock(),
        update: mock(),
    },
    quickBooksPayee: {
        findUnique: mock(),
        findMany: mock(),
        create: mock(),
        update: mock(),
    },
    integrationSyncRun: {
        findFirst: mock(),
        create: mock(),
    },
};

mock.module('axios', () => ({
    default: axiosMock,
}));

mock.module('@lib/prisma', () => ({
    prisma: prismaMock,
}));

mock.module('@utils/generateNanoId', () => ({
    generateNanoId: idMock,
}));

const clearMock = (fn: MockFn) => {
    fn.mockClear();
};

const resetPrismaMocks = () => {
    prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock)
    );

    for (const value of Object.values(prismaMock)) {
        if (typeof value === 'function') {
            clearMock(value as MockFn);
            continue;
        }

        for (const nested of Object.values(value)) {
            clearMock(nested as MockFn);
        }
    }
};

const resetEnv = () => {
    process.env.QUICKBOOKS_CLIENT_ID = 'client-id';
    process.env.QUICKBOOKS_CLIENT_SECRET = 'client-secret';
    process.env.QUICKBOOKS_REDIRECT_URI =
        'https://api.example.com/api/v1/integrations/quickbooks/callback';
    process.env.QUICKBOOKS_TOKEN_ENCRYPTION_KEY = 'test-encryption-secret';
    process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox';
    process.env.QUICKBOOKS_MINOR_VERSION = '75';
    process.env.CLIENT_URL = 'https://app.example.com';
};

const makeConnection = async (overrides: Record<string, unknown> = {}) => {
    const { encryptQuickBooksToken } = await import('./quickbooks-crypto.js');
    const now = Date.now();

    return {
        id: 'connection-1',
        realmId: 'realm-1',
        companyName: 'Test Company',
        environment: 'SANDBOX',
        status: 'CONNECTED',
        scope: 'com.intuit.quickbooks.accounting',
        accessToken: encryptQuickBooksToken('access-token'),
        refreshToken: encryptQuickBooksToken('refresh-token'),
        tokenType: 'bearer',
        accessTokenExpiresAt: new Date(now + 60 * 60 * 1000),
        refreshTokenExpiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000),
        connectedById: 'user-1',
        lastSyncedAt: null,
        referenceAutoSyncEnabled: false,
        disconnectedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        ...overrides,
    };
};

beforeEach(() => {
    resetEnv();
    resetPrismaMocks();
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    idMock.mockReset();
    idMock.mockImplementation(() => 'generated-id');
});

describe('QuickBooks crypto', () => {
    test('encrypts and decrypts tokens with the configured encryption key', async () => {
        const { encryptQuickBooksToken, decryptQuickBooksToken } =
            await import('./quickbooks-crypto.js');

        const encrypted = encryptQuickBooksToken('refresh-token');

        expect(encrypted).toStartWith('v1:');
        expect(encrypted).not.toContain('refresh-token');
        expect(decryptQuickBooksToken(encrypted)).toBe('refresh-token');
    });

    test('rejects invalid or missing token values', async () => {
        const { decryptQuickBooksToken } = await import('./quickbooks-crypto.js');

        expect(() => decryptQuickBooksToken('')).toThrow('QuickBooks token is missing');
        expect(() => decryptQuickBooksToken('not-a-token')).toThrow(
            'QuickBooks token format is invalid'
        );
    });
});

describe('QuickBooks client', () => {
    test('reports missing config and defaults to sandbox settings', async () => {
        const { getQuickBooksConfigurationStatus } = await import('./quickbooks-client.js');

        delete process.env.QUICKBOOKS_CLIENT_SECRET;

        expect(getQuickBooksConfigurationStatus()).toMatchObject({
            configured: false,
            missing: ['QUICKBOOKS_CLIENT_SECRET'],
            environment: 'sandbox',
            apiBaseUrl: 'https://sandbox-quickbooks.api.intuit.com',
            minorVersion: '75',
        });
    });

    test('uses production API base URL and custom minor version when configured', async () => {
        const { getQuickBooksConfigurationStatus } = await import('./quickbooks-client.js');

        process.env.QUICKBOOKS_ENVIRONMENT = 'production';
        process.env.QUICKBOOKS_MINOR_VERSION = '83';

        expect(getQuickBooksConfigurationStatus()).toMatchObject({
            configured: true,
            environment: 'production',
            apiBaseUrl: 'https://quickbooks.api.intuit.com',
            minorVersion: '83',
        });
    });

    test('builds the Intuit authorization URL with accounting scope and state', async () => {
        const { QuickBooksClient } = await import('./quickbooks-client.js');

        const url = new URL(QuickBooksClient.createAuthorizationUrl('state-123'));

        expect(url.origin + url.pathname).toBe('https://appcenter.intuit.com/connect/oauth2');
        expect(url.searchParams.get('client_id')).toBe('client-id');
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('scope')).toBe('com.intuit.quickbooks.accounting');
        expect(url.searchParams.get('redirect_uri')).toBe(process.env.QUICKBOOKS_REDIRECT_URI!);
        expect(url.searchParams.get('state')).toBe('state-123');
    });

    test('exchanges authorization code and normalizes token fields', async () => {
        const { QuickBooksClient } = await import('./quickbooks-client.js');
        axiosMock.post.mockResolvedValueOnce({
            data: {
                access_token: 'access',
                refresh_token: 'refresh',
                expires_in: 3600,
                x_refresh_token_expires_in: 8726400,
                token_type: 'bearer',
            },
        });

        const token = await QuickBooksClient.exchangeAuthorizationCode('auth-code');

        expect(token).toEqual({
            accessToken: 'access',
            refreshToken: 'refresh',
            expiresIn: 3600,
            refreshTokenExpiresIn: 8726400,
            tokenType: 'bearer',
        });
        expect(axiosMock.post).toHaveBeenCalledWith(
            'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
            expect.any(URLSearchParams),
            expect.objectContaining({
                headers: expect.objectContaining({
                    authorization: expect.stringMatching(/^Basic /),
                    'content-type': 'application/x-www-form-urlencoded',
                }),
            })
        );
    });

    test('refreshes and revokes tokens against the Intuit OAuth endpoints', async () => {
        const { QuickBooksClient } = await import('./quickbooks-client.js');
        axiosMock.post.mockResolvedValueOnce({
            data: {
                access_token: 'refreshed-access',
                refresh_token: 'refreshed-refresh',
                expires_in: 3600,
                token_type: 'bearer',
            },
        });
        axiosMock.post.mockResolvedValueOnce({});

        await expect(QuickBooksClient.refreshToken('old-refresh-token')).resolves.toEqual({
            accessToken: 'refreshed-access',
            refreshToken: 'refreshed-refresh',
            expiresIn: 3600,
            refreshTokenExpiresIn: null,
            tokenType: 'bearer',
        });
        await expect(QuickBooksClient.revokeToken('revoked-token')).resolves.toBeUndefined();

        expect(axiosMock.post).toHaveBeenNthCalledWith(
            1,
            'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
            expect.any(URLSearchParams),
            expect.any(Object)
        );
        expect(axiosMock.post).toHaveBeenNthCalledWith(
            2,
            'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
            { token: 'revoked-token' },
            expect.objectContaining({
                headers: expect.objectContaining({ 'content-type': 'application/json' }),
            })
        );
    });

    test('queries QuickBooks entities and extracts CDC rows', async () => {
        const { QuickBooksClient } = await import('./quickbooks-client.js');
        axiosMock.get
            .mockResolvedValueOnce({
                data: {
                    QueryResponse: {
                        Account: [{ Id: '1', Name: 'Checking' }, 'ignored'],
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    CDCResponse: [
                        {
                            QueryResponse: [
                                { Account: [{ Id: '1' }] },
                                { Vendor: [{ Id: '2' }, null] },
                            ],
                        },
                    ],
                    time: '2026-06-01T00:00:00.000Z',
                },
            });

        await expect(
            QuickBooksClient.queryEntity(
                'realm-1',
                'access-token',
                'Account',
                'SELECT * FROM Account'
            )
        ).resolves.toEqual([{ Id: '1', Name: 'Checking' }]);

        await expect(
            QuickBooksClient.changeDataCapture(
                'realm-1',
                'access-token',
                ['Account', 'Vendor'],
                new Date(0)
            )
        ).resolves.toEqual({
            rowsByEntity: {
                Account: [{ Id: '1' }],
                Vendor: [{ Id: '2' }],
            },
            responseTime: '2026-06-01T00:00:00.000Z',
        });
    });

    test('gets company info using company name with legal name fallback', async () => {
        const { QuickBooksClient } = await import('./quickbooks-client.js');
        axiosMock.get
            .mockResolvedValueOnce({
                data: {
                    CompanyInfo: {
                        Id: 'realm-1',
                        CompanyName: 'Preferred Company',
                        LegalName: 'Legal Company LLC',
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    CompanyInfo: {
                        Id: 'realm-2',
                        LegalName: 'Only Legal LLC',
                    },
                },
            });

        await expect(QuickBooksClient.getCompanyInfo('realm-1', 'access-token')).resolves.toEqual({
            id: 'realm-1',
            name: 'Preferred Company',
        });
        await expect(QuickBooksClient.getCompanyInfo('realm-2', 'access-token')).resolves.toEqual({
            id: 'realm-2',
            name: 'Only Legal LLC',
        });
    });

    test('retries QuickBooks rate limits with retry-after', async () => {
        const { QuickBooksClient } = await import('./quickbooks-client.js');
        axiosMock.get
            .mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 429, headers: { 'retry-after': '0.001' } },
            })
            .mockResolvedValueOnce({ data: { QueryResponse: { Vendor: [{ Id: 'vendor-1' }] } } });

        const rows = await QuickBooksClient.queryEntity(
            'realm-1',
            'access-token',
            'Vendor',
            'SELECT * FROM Vendor'
        );

        expect(rows).toEqual([{ Id: 'vendor-1' }]);
        expect(axiosMock.get).toHaveBeenCalledTimes(2);
    });
});

describe('QuickBooks token helper', () => {
    test('returns the current access token when it is not close to expiry', async () => {
        const { getValidQuickBooksAccessToken } = await import('./quickbooks-token-helper.js');
        const connection = await makeConnection();

        await expect(getValidQuickBooksAccessToken(connection as never)).resolves.toBe(
            'access-token'
        );
        expect(axiosMock.post).not.toHaveBeenCalled();
    });

    test('refreshes expiring access tokens and stores the replacement', async () => {
        const { getValidQuickBooksAccessToken } = await import('./quickbooks-token-helper.js');
        const connection = await makeConnection({
            accessTokenExpiresAt: new Date(Date.now() + 60 * 1000),
        });
        axiosMock.post.mockResolvedValueOnce({
            data: {
                access_token: 'new-access-token',
                refresh_token: 'new-refresh-token',
                expires_in: 3600,
                x_refresh_token_expires_in: 8726400,
                token_type: 'bearer',
            },
        });

        await expect(getValidQuickBooksAccessToken(connection as never)).resolves.toBe(
            'new-access-token'
        );

        expect(prismaMock.quickBooksConnection.update).toHaveBeenCalledWith({
            where: { id: 'connection-1' },
            data: expect.objectContaining({
                accessToken: expect.stringMatching(/^v1:/),
                refreshToken: expect.stringMatching(/^v1:/),
                tokenType: 'bearer',
            }),
        });
    });

    test('marks the connection disconnected when QuickBooks rejects refresh auth', async () => {
        const { getValidQuickBooksAccessToken } = await import('./quickbooks-token-helper.js');
        const connection = await makeConnection({
            accessTokenExpiresAt: new Date(Date.now() + 60 * 1000),
        });
        axiosMock.post.mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 400, data: { error: 'invalid_grant' } },
        });

        await expect(getValidQuickBooksAccessToken(connection as never)).rejects.toThrow(
            'QuickBooks authorization has been revoked. Please reconnect.'
        );
        expect(prismaMock.quickBooksConnection.update).toHaveBeenCalledWith({
            where: { id: 'connection-1' },
            data: expect.objectContaining({
                status: 'DISCONNECTED',
                accessToken: '',
                refreshToken: '',
                disconnectedAt: expect.any(Date),
            }),
        });
    });
});

describe('QuickBooks service', () => {
    test('returns configured status with token health for the active connection', async () => {
        const { QuickBooksService } = await import('./service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValueOnce(
            await makeConnection({
                id: 'connection-1',
                refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            })
        );

        await expect(QuickBooksService.getStatus()).resolves.toMatchObject({
            configured: true,
            missingConfig: [],
            environment: 'sandbox',
            redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
            apiBaseUrl: 'https://sandbox-quickbooks.api.intuit.com',
            minorVersion: '75',
            connection: {
                id: 'connection-1',
                realmId: 'realm-1',
                companyName: 'Test Company',
                environment: 'sandbox',
                status: 'CONNECTED',
                connectedById: 'user-1',
                tokenHealth: 'expiring',
            },
        });
    });

    test('creates an OAuth state and returns an authorization URL', async () => {
        const { QuickBooksService } = await import('./service.js');
        idMock.mockReturnValueOnce('state-row-id');
        prismaMock.quickBooksOAuthState.deleteMany.mockResolvedValueOnce({ count: 0 });
        prismaMock.quickBooksOAuthState.create.mockResolvedValueOnce({});

        const result = await QuickBooksService.createAuthorizationUrl('user-1');

        expect(result.authorizationUrl).toContain('https://appcenter.intuit.com/connect/oauth2');
        expect(result.scope).toBe('com.intuit.quickbooks.accounting');
        expect(result.environment).toBe('sandbox');
        expect(prismaMock.quickBooksOAuthState.deleteMany).toHaveBeenCalledWith({
            where: {
                OR: [{ userId: 'user-1' }, { expiresAt: { lt: expect.any(Date) } }],
            },
        });
        expect(prismaMock.quickBooksOAuthState.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                id: 'state-row-id',
                userId: 'user-1',
                state: expect.any(String),
                redirectTo: 'https://app.example.com/app/settings/integrations',
                expiresAt: expect.any(Date),
            }),
        });
    });

    test('handles callback errors, missing responses, and invalid OAuth state without calling Intuit', async () => {
        const { QuickBooksService } = await import('./service.js');
        prismaMock.quickBooksOAuthState.findUnique.mockResolvedValueOnce(null);

        await expect(
            QuickBooksService.handleCallback({
                state: 'state-1',
                error: 'access_denied',
                error_description: 'Denied',
            })
        ).resolves.toEqual({
            redirectUrl:
                'https://app.example.com/app/settings/integrations?quickbooks=error&reason=Denied',
        });

        await expect(QuickBooksService.handleCallback({ state: 'state-1' })).resolves.toEqual({
            redirectUrl:
                'https://app.example.com/app/settings/integrations?quickbooks=error&reason=missing_authorization_response',
        });

        await expect(
            QuickBooksService.handleCallback({
                state: 'state-1',
                code: 'code-1',
                realmId: 'realm-1',
            })
        ).resolves.toEqual({
            redirectUrl:
                'https://app.example.com/app/settings/integrations?quickbooks=error&reason=invalid_state',
        });
        expect(axiosMock.post).not.toHaveBeenCalled();
    });

    test('stores a successful connection and disconnects other active realms', async () => {
        const { QuickBooksService } = await import('./service.js');
        const other = await makeConnection({ id: 'other-connection', realmId: 'other-realm' });
        prismaMock.quickBooksOAuthState.findUnique.mockResolvedValueOnce({
            state: 'state-1',
            userId: 'user-1',
            expiresAt: new Date(Date.now() + 60_000),
        });
        prismaMock.quickBooksOAuthState.delete.mockResolvedValueOnce({});
        prismaMock.quickBooksConnection.findMany.mockResolvedValueOnce([other]);
        prismaMock.quickBooksConnection.upsert.mockResolvedValueOnce({});
        prismaMock.quickBooksConnection.update.mockResolvedValueOnce({});
        axiosMock.post
            .mockResolvedValueOnce({
                data: {
                    access_token: 'access-token',
                    refresh_token: 'refresh-token',
                    expires_in: 3600,
                    x_refresh_token_expires_in: 8726400,
                    token_type: 'bearer',
                },
            })
            .mockResolvedValueOnce({});
        axiosMock.get.mockResolvedValueOnce({
            data: {
                CompanyInfo: {
                    Id: 'realm-1',
                    CompanyName: 'Connected Company',
                },
            },
        });

        const result = await QuickBooksService.handleCallback({
            state: 'state-1',
            code: 'code-1',
            realmId: 'realm-1',
        });

        expect(result).toEqual({
            redirectUrl:
                'https://app.example.com/app/settings/integrations?quickbooks=connected&realmId=realm-1',
        });
        expect(prismaMock.quickBooksConnection.update).toHaveBeenCalledWith({
            where: { id: 'other-connection' },
            data: expect.objectContaining({ status: 'DISCONNECTED' }),
        });
        expect(prismaMock.quickBooksConnection.upsert).toHaveBeenCalledWith({
            where: { realmId: 'realm-1' },
            update: expect.objectContaining({
                companyName: 'Connected Company',
                connectedById: 'user-1',
                referenceAutoSyncEnabled: true,
                accessToken: expect.stringMatching(/^v1:/),
                refreshToken: expect.stringMatching(/^v1:/),
            }),
            create: expect.objectContaining({
                realmId: 'realm-1',
                companyName: 'Connected Company',
                connectedById: 'user-1',
                referenceAutoSyncEnabled: true,
            }),
        });
    });

    test('disconnects the active connection locally even when token revocation fails', async () => {
        const { QuickBooksService } = await import('./service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValueOnce(await makeConnection());
        prismaMock.quickBooksConnection.update.mockResolvedValueOnce({});
        axiosMock.post.mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 400, data: 'already revoked' },
        });

        await expect(QuickBooksService.disconnect()).resolves.toEqual({ disconnected: true });
        expect(prismaMock.quickBooksConnection.update).toHaveBeenCalledWith({
            where: { id: 'connection-1' },
            data: expect.objectContaining({
                status: 'DISCONNECTED',
                accessToken: '',
                refreshToken: '',
            }),
        });
    });

    test('returns disconnected false when no active QuickBooks connection exists', async () => {
        const { QuickBooksService } = await import('./service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValueOnce(null);

        await expect(QuickBooksService.disconnect()).resolves.toEqual({ disconnected: false });
        expect(axiosMock.post).not.toHaveBeenCalled();
        expect(prismaMock.quickBooksConnection.update).not.toHaveBeenCalled();
    });

    test('handles Intuit disconnect callback by marking the matching realm disconnected', async () => {
        const { QuickBooksService } = await import('./service.js');
        prismaMock.quickBooksConnection.findUnique.mockResolvedValueOnce(await makeConnection());
        prismaMock.quickBooksConnection.update.mockResolvedValueOnce({});

        await expect(
            QuickBooksService.handleDisconnectCallback({ realmId: 'realm-1' })
        ).resolves.toEqual({
            redirectUrl: 'https://app.example.com/quickbooks/disconnected?realmId=realm-1',
        });
        expect(prismaMock.quickBooksConnection.update).toHaveBeenCalledWith({
            where: { id: 'connection-1' },
            data: expect.objectContaining({ status: 'DISCONNECTED' }),
        });
    });

    test('creates vendor check purchases without sending a QuickBooks document number', async () => {
        const { QuickBooksService } = await import('./service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValueOnce(await makeConnection());
        prismaMock.quickBooksPayee.findUnique.mockResolvedValueOnce({ id: 'payee-1' });
        prismaMock.quickBooksBankAccount.findUnique.mockResolvedValueOnce({ id: 'bank-1' });
        prismaMock.quickBooksLineItemCategory.findUnique.mockResolvedValueOnce({
            id: 'category-1',
        });
        axiosMock.post.mockResolvedValueOnce({
            data: {
                Purchase: {
                    Id: 'purchase-1',
                    SyncToken: '0',
                    TotalAmt: 900,
                    MetaData: {
                        CreateTime: '2026-06-15T08:00:00-07:00',
                        LastUpdatedTime: '2026-06-15T08:00:00-07:00',
                    },
                },
                time: '2026-06-15T15:00:00.000Z',
            },
        });

        await expect(
            QuickBooksService.createVendorPurchase({
                qbVendorId: 'qb-vendor-1',
                bankAccountId: 'qb-bank-1',
                categoryId: 'qb-category-1',
                amount: 900,
                txnDate: new Date('2026-06-15T00:00:00.000Z'),
                lineDescription: 'PO#23108 - Partial Payment 1',
                memo: 'Monthly bill payment',
            })
        ).resolves.toMatchObject({
            transactionId: 'purchase-1',
            transactionUrl: 'https://app.sandbox.qbo.intuit.com/app/check?txnId=purchase-1',
            quickBooksResponse: {
                Purchase: {
                    Id: 'purchase-1',
                    SyncToken: '0',
                    TotalAmt: 900,
                    MetaData: {
                        CreateTime: '2026-06-15T08:00:00-07:00',
                        LastUpdatedTime: '2026-06-15T08:00:00-07:00',
                    },
                },
                time: '2026-06-15T15:00:00.000Z',
            },
        });

        const body = axiosMock.post.mock.calls[0]?.[1] as Record<string, unknown>;
        expect(body).toMatchObject({
            PaymentType: 'Check',
            TxnDate: '2026-06-15',
            AccountRef: { value: 'qb-bank-1' },
            EntityRef: { value: 'qb-vendor-1', type: 'Vendor' },
            PrivateNote: 'Monthly bill payment',
            Line: [
                expect.objectContaining({
                    Amount: 900,
                    Description: 'PO#23108 - Partial Payment 1',
                }),
            ],
        });
        expect('DocNumber' in body).toBe(false);
    });
});

describe('QuickBooks route models and public callbacks', () => {
    test('parses includeInactive query values for reference list endpoints', async () => {
        const { QuickBooksReferenceListQuerySchema } = await import('./models.js');

        expect(QuickBooksReferenceListQuerySchema.parse({})).toEqual({
            includeInactive: false,
        });
        expect(QuickBooksReferenceListQuerySchema.parse({ includeInactive: 'false' })).toEqual({
            includeInactive: false,
        });
        expect(QuickBooksReferenceListQuerySchema.parse({ includeInactive: 'true' })).toEqual({
            includeInactive: true,
        });
    });

    test('public OAuth callback redirects back to frontend settings with success state', async () => {
        const { default: publicRoutes } = await import('./public-routes.js');
        const app = publicRoutes as unknown as PublicRouteApp;
        prismaMock.quickBooksOAuthState.findUnique.mockResolvedValueOnce({
            state: 'state-1',
            userId: 'user-1',
            expiresAt: new Date(Date.now() + 60_000),
        });
        prismaMock.quickBooksOAuthState.delete.mockResolvedValueOnce({});
        prismaMock.quickBooksConnection.findMany.mockResolvedValueOnce([]);
        prismaMock.quickBooksConnection.upsert.mockResolvedValueOnce({});
        axiosMock.post.mockResolvedValueOnce({
            data: {
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                expires_in: 3600,
                x_refresh_token_expires_in: 8726400,
                token_type: 'bearer',
            },
        });
        axiosMock.get.mockResolvedValueOnce({
            data: { CompanyInfo: { Id: 'realm-1', CompanyName: 'Connected Company' } },
        });

        const response = await app.request(
            '/quickbooks/callback?state=state-1&code=code-1&realmId=realm-1'
        );

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe(
            'https://app.example.com/app/settings/integrations?quickbooks=connected&realmId=realm-1'
        );
        await expect(response.text()).resolves.toContain('Redirecting');
    });

    test('public disconnect callback redirects to the disconnected page', async () => {
        const { default: publicRoutes } = await import('./public-routes.js');
        const app = publicRoutes as unknown as PublicRouteApp;
        prismaMock.quickBooksConnection.findUnique.mockResolvedValueOnce(await makeConnection());
        prismaMock.quickBooksConnection.update.mockResolvedValueOnce({});

        const response = await app.request('/quickbooks/disconnect-callback?realmId=realm-1');

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe(
            'https://app.example.com/quickbooks/disconnected?realmId=realm-1'
        );
    });
});

describe('QuickBooks reference sync service', () => {
    test('returns reference sync status when disconnected and when connected', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValueOnce(null);
        prismaMock.integrationSyncRun.findFirst.mockResolvedValueOnce({
            finishedAt: new Date('2026-06-10T12:00:00.000Z'),
            status: 'FAILED',
            error: 'previous failure',
            totalReceived: 2,
            createdCount: 1,
            updatedCount: 1,
            deletedCount: 0,
        });

        await expect(QuickBooksReferenceSyncService.getStatus()).resolves.toMatchObject({
            provider: 'quickbooks',
            connected: false,
            autoDailySyncEnabled: false,
            lastSyncedAt: '2026-06-10T12:00:00.000Z',
            lastSyncStatus: 'FAILED',
            lastSyncError: 'previous failure',
            totals: {
                totalReceived: 0,
                createdCount: 0,
                updatedCount: 0,
                deletedCount: 0,
            },
            entities: [],
        });

        prismaMock.quickBooksConnection.findFirst.mockResolvedValueOnce(
            await makeConnection({ referenceAutoSyncEnabled: true })
        );
        prismaMock.integrationSyncRun.findFirst.mockResolvedValueOnce({
            finishedAt: new Date('2026-06-11T12:00:00.000Z'),
            status: 'SUCCESS',
            error: null,
            totalReceived: 5,
            createdCount: 2,
            updatedCount: 3,
            deletedCount: 0,
        });
        prismaMock.quickBooksReferenceSyncState.findMany.mockResolvedValueOnce([
            {
                entity: 'BANK_ACCOUNT',
                lastFullSyncedAt: new Date('2026-06-11T10:00:00.000Z'),
                lastCdcSyncedAt: null,
                cdcWatermark: new Date('2026-06-11T10:00:00.000Z'),
                lastSyncStatus: 'SUCCESS',
                lastSyncError: null,
                totalReceived: 1,
                createdCount: 1,
                updatedCount: 0,
                deletedCount: 0,
            },
        ]);

        await expect(QuickBooksReferenceSyncService.getStatus()).resolves.toMatchObject({
            provider: 'quickbooks',
            connected: true,
            autoDailySyncEnabled: true,
            lastSyncedAt: '2026-06-11T12:00:00.000Z',
            lastSyncStatus: 'SUCCESS',
            totals: {
                totalReceived: 5,
                createdCount: 2,
                updatedCount: 3,
                deletedCount: 0,
            },
            entities: expect.arrayContaining([
                expect.objectContaining({
                    entity: 'BANK_ACCOUNT',
                    lastSyncStatus: 'SUCCESS',
                    totalReceived: 1,
                }),
                expect.objectContaining({ entity: 'LINE_ITEM_CATEGORY' }),
                expect.objectContaining({ entity: 'PAYEE' }),
            ]),
        });
    });

    test('lists active bank accounts, categories, and payees for the active realm', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValue(await makeConnection());
        prismaMock.quickBooksBankAccount.findMany.mockResolvedValueOnce([
            {
                id: 'bank-1',
                realmId: 'realm-1',
                quickBooksId: 'qb-bank-1',
                name: 'Checking',
                fullyQualifiedName: 'Assets:Checking',
                accountSubType: 'Checking',
                currencyCode: 'USD',
                active: true,
                deletedAt: null,
            },
        ]);
        prismaMock.quickBooksLineItemCategory.findMany.mockResolvedValueOnce([
            {
                id: 'cat-1',
                realmId: 'realm-1',
                quickBooksId: 'qb-cat-1',
                name: 'Materials',
                fullyQualifiedName: 'COGS:Materials',
                accountType: 'Cost of Goods Sold',
                accountSubType: 'SuppliesMaterialsCogs',
                currencyCode: 'USD',
                active: true,
                deletedAt: null,
            },
        ]);
        prismaMock.quickBooksPayee.findMany.mockResolvedValueOnce([
            {
                id: 'payee-1',
                realmId: 'realm-1',
                quickBooksId: 'qb-vendor-1',
                displayName: 'Acme Supply',
                companyName: 'Acme Supply LLC',
                primaryEmail: 'ap@acme.test',
                primaryPhone: '555-0100',
                active: true,
                deletedAt: null,
            },
        ]);

        await expect(QuickBooksReferenceSyncService.listBankAccounts()).resolves.toEqual([
            {
                id: 'bank-1',
                realmId: 'realm-1',
                qbId: 'qb-bank-1',
                name: 'Checking',
                fullyQualifiedName: 'Assets:Checking',
                accountSubType: 'Checking',
                currencyCode: 'USD',
                active: true,
                deletedAt: null,
            },
        ]);
        await expect(QuickBooksReferenceSyncService.listLineItemCategories()).resolves.toEqual([
            {
                id: 'cat-1',
                realmId: 'realm-1',
                qbId: 'qb-cat-1',
                name: 'Materials',
                fullyQualifiedName: 'COGS:Materials',
                accountType: 'Cost of Goods Sold',
                accountSubType: 'SuppliesMaterialsCogs',
                currencyCode: 'USD',
                active: true,
                deletedAt: null,
            },
        ]);
        await expect(QuickBooksReferenceSyncService.listPayees()).resolves.toEqual([
            {
                id: 'payee-1',
                realmId: 'realm-1',
                qbId: 'qb-vendor-1',
                displayName: 'Acme Supply',
                companyName: 'Acme Supply LLC',
                primaryEmail: 'ap@acme.test',
                primaryPhone: '555-0100',
                active: true,
                deletedAt: null,
            },
        ]);
    });

    test('passes includeInactive through to the reference list queries', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValue(await makeConnection());
        prismaMock.quickBooksBankAccount.findMany.mockResolvedValueOnce([]);
        prismaMock.quickBooksLineItemCategory.findMany.mockResolvedValueOnce([]);
        prismaMock.quickBooksPayee.findMany.mockResolvedValueOnce([]);

        await QuickBooksReferenceSyncService.listBankAccounts({ includeInactive: true });
        await QuickBooksReferenceSyncService.listLineItemCategories({ includeInactive: true });
        await QuickBooksReferenceSyncService.listPayees({ includeInactive: true });

        expect(prismaMock.quickBooksBankAccount.findMany).toHaveBeenCalledWith({
            where: { realmId: 'realm-1' },
            orderBy: [{ fullyQualifiedName: 'asc' }, { name: 'asc' }],
        });
        expect(prismaMock.quickBooksLineItemCategory.findMany).toHaveBeenCalledWith({
            where: { realmId: 'realm-1' },
            orderBy: [{ fullyQualifiedName: 'asc' }, { name: 'asc' }],
        });
        expect(prismaMock.quickBooksPayee.findMany).toHaveBeenCalledWith({
            where: { realmId: 'realm-1' },
            orderBy: { displayName: 'asc' },
        });
    });

    test('throws for reference list and sync operations when QuickBooks is not connected', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValue(null);

        await expect(QuickBooksReferenceSyncService.listBankAccounts()).rejects.toThrow(
            'QuickBooks is not connected'
        );
        await expect(QuickBooksReferenceSyncService.listLineItemCategories()).rejects.toThrow(
            'QuickBooks is not connected'
        );
        await expect(QuickBooksReferenceSyncService.listPayees()).rejects.toThrow(
            'QuickBooks is not connected'
        );
        await expect(QuickBooksReferenceSyncService.syncReferenceData()).rejects.toThrow(
            'QuickBooks is not connected'
        );
    });

    test('updates the auto daily sync flag on the active connection', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValueOnce(await makeConnection());
        prismaMock.quickBooksConnection.update.mockResolvedValueOnce({});

        await expect(QuickBooksReferenceSyncService.setAutoDailySync(true)).resolves.toEqual({
            autoDailySyncEnabled: true,
        });
        expect(prismaMock.quickBooksConnection.update).toHaveBeenCalledWith({
            where: { id: 'connection-1' },
            data: { referenceAutoSyncEnabled: true },
        });
    });

    test('runs a full reference sync and maps QuickBooks Account/Vendor rows to local reference tables', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        const connection = await makeConnection();
        const states: Array<Record<string, unknown>> = [];
        const bankAccounts: Array<Record<string, unknown>> = [];
        const categories: Array<Record<string, unknown>> = [];
        const payees: Array<Record<string, unknown>> = [];
        const syncRuns: Array<Record<string, unknown>> = [];

        prismaMock.quickBooksConnection.findFirst.mockResolvedValue(connection);
        prismaMock.quickBooksConnection.update.mockResolvedValue({});
        prismaMock.quickBooksReferenceSyncLock.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.quickBooksReferenceSyncLock.create.mockResolvedValue({});
        prismaMock.quickBooksReferenceSyncState.findUnique.mockResolvedValue(null);
        prismaMock.quickBooksReferenceSyncState.upsert.mockImplementation(
            async ({ where, create, update }) => {
                const existing = states.find(
                    (state) =>
                        state.realmId === where.realmId_entity.realmId &&
                        state.entity === where.realmId_entity.entity
                );
                if (existing) Object.assign(existing, update);
                else states.push(create);
                return existing ?? create;
            }
        );
        prismaMock.quickBooksBankAccount.findUnique.mockImplementation(async ({ where }) =>
            bankAccounts.find(
                (row) =>
                    row.realmId === where.realmId_quickBooksId.realmId &&
                    row.quickBooksId === where.realmId_quickBooksId.quickBooksId
            )
        );
        prismaMock.quickBooksBankAccount.create.mockImplementation(async ({ data }) => {
            bankAccounts.push(data);
            return data;
        });
        prismaMock.quickBooksLineItemCategory.findUnique.mockImplementation(async ({ where }) =>
            categories.find(
                (row) =>
                    row.realmId === where.realmId_quickBooksId.realmId &&
                    row.quickBooksId === where.realmId_quickBooksId.quickBooksId
            )
        );
        prismaMock.quickBooksLineItemCategory.create.mockImplementation(async ({ data }) => {
            categories.push(data);
            return data;
        });
        prismaMock.quickBooksPayee.findUnique.mockImplementation(async ({ where }) =>
            payees.find(
                (row) =>
                    row.realmId === where.realmId_quickBooksId.realmId &&
                    row.quickBooksId === where.realmId_quickBooksId.quickBooksId
            )
        );
        prismaMock.quickBooksPayee.create.mockImplementation(async ({ data }) => {
            payees.push(data);
            return data;
        });
        prismaMock.integrationSyncRun.create.mockImplementation(async ({ data }) => {
            syncRuns.push(data);
            return data;
        });
        axiosMock.get.mockImplementation(async (_url, config) => {
            const query = String(config.params.query);
            if (query.includes('FROM Account')) {
                return {
                    data: {
                        QueryResponse: {
                            Account: [
                                {
                                    Id: 'account-bank',
                                    Name: 'Checking',
                                    FullyQualifiedName: 'Assets:Checking',
                                    AccountType: 'Bank',
                                    AccountSubType: 'Checking',
                                    Active: true,
                                    CurrentBalance: 123.45,
                                    CurrencyRef: { value: 'USD' },
                                    SyncToken: '1',
                                    MetaData: {
                                        CreateTime: '2026-01-01T00:00:00.000Z',
                                        LastUpdatedTime: '2026-01-02T00:00:00.000Z',
                                    },
                                },
                                {
                                    Id: 'account-category',
                                    Name: 'Materials',
                                    FullyQualifiedName: 'COGS:Materials',
                                    AccountType: 'Cost of Goods Sold',
                                    AccountSubType: 'SuppliesMaterialsCogs',
                                    Description: 'Material purchases',
                                    Active: true,
                                    CurrencyRef: { value: 'USD' },
                                },
                            ],
                        },
                    },
                };
            }

            return {
                data: {
                    QueryResponse: {
                        Vendor: [
                            {
                                Id: 'vendor-1',
                                DisplayName: 'Acme Supply',
                                CompanyName: 'Acme Supply LLC',
                                PrimaryEmailAddr: { Address: 'ap@acme.test' },
                                PrimaryPhone: { FreeFormNumber: '555-0100' },
                                Active: true,
                                SyncToken: '4',
                                MetaData: {
                                    LastUpdatedTime: '2026-01-03T00:00:00.000Z',
                                },
                            },
                        ],
                    },
                },
            };
        });

        const result = await QuickBooksReferenceSyncService.syncReferenceData({
            trigger: 'MANUAL',
            userId: 'user-1',
        });

        expect(result).toMatchObject({
            provider: 'quickbooks',
            trigger: 'MANUAL',
            status: 'SUCCESS',
            totalReceived: 3,
            createdCount: 3,
            updatedCount: 0,
            deletedCount: 0,
        });
        expect(result?.entities.map((entity: { entity: string }) => entity.entity)).toEqual([
            'BANK_ACCOUNT',
            'LINE_ITEM_CATEGORY',
            'PAYEE',
        ]);
        expect(bankAccounts).toHaveLength(1);
        expect(bankAccounts[0]).toMatchObject({
            realmId: 'realm-1',
            quickBooksId: 'account-bank',
            name: 'Checking',
            accountType: 'Bank',
            currencyCode: 'USD',
            active: true,
        });
        expect(categories).toHaveLength(1);
        expect(categories[0]).toMatchObject({
            realmId: 'realm-1',
            quickBooksId: 'account-category',
            name: 'Materials',
            accountType: 'Cost of Goods Sold',
            description: 'Material purchases',
        });
        expect(payees).toHaveLength(1);
        expect(payees[0]).toMatchObject({
            realmId: 'realm-1',
            quickBooksId: 'vendor-1',
            displayName: 'Acme Supply',
            companyName: 'Acme Supply LLC',
            primaryEmail: 'ap@acme.test',
            primaryPhone: '555-0100',
        });
        expect(states.map((state) => state.entity).sort()).toEqual([
            'BANK_ACCOUNT',
            'LINE_ITEM_CATEGORY',
            'PAYEE',
        ]);
        expect(syncRuns[0]).toMatchObject({
            provider: 'quickbooks',
            scope: 'reference-data',
            trigger: 'MANUAL',
            status: 'SUCCESS',
            attempted: 3,
            succeeded: 3,
            failed: 0,
            totalReceived: 3,
        });
    });

    test('runs CDC sync and updates inactive/deleted bank accounts, categories, and payees', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        const watermark = new Date(Date.now() - 60 * 60 * 1000);
        prismaMock.quickBooksConnection.findFirst.mockResolvedValue(await makeConnection());
        prismaMock.quickBooksConnection.update.mockResolvedValue({});
        prismaMock.quickBooksReferenceSyncLock.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.quickBooksReferenceSyncLock.create.mockResolvedValue({});
        prismaMock.quickBooksReferenceSyncState.findUnique
            .mockResolvedValueOnce({ entity: 'BANK_ACCOUNT', cdcWatermark: watermark })
            .mockResolvedValueOnce({ entity: 'LINE_ITEM_CATEGORY', cdcWatermark: watermark })
            .mockResolvedValueOnce({ entity: 'PAYEE', cdcWatermark: watermark });
        prismaMock.quickBooksReferenceSyncState.upsert.mockResolvedValue({});
        prismaMock.quickBooksBankAccount.findUnique.mockImplementation(async ({ where }) =>
            where.realmId_quickBooksId.quickBooksId === 'bank-deleted'
                ? { id: 'bank-existing', deletedAt: null }
                : null
        );
        prismaMock.quickBooksLineItemCategory.findUnique.mockImplementation(async ({ where }) =>
            where.realmId_quickBooksId.quickBooksId === 'category-inactive'
                ? { id: 'category-existing', deletedAt: null }
                : null
        );
        prismaMock.quickBooksPayee.findUnique.mockImplementation(async ({ where }) =>
            where.realmId_quickBooksId.quickBooksId === 'vendor-inactive'
                ? { id: 'payee-existing', deletedAt: null }
                : null
        );
        prismaMock.quickBooksBankAccount.update.mockResolvedValue({});
        prismaMock.quickBooksLineItemCategory.update.mockResolvedValue({});
        prismaMock.quickBooksPayee.update.mockResolvedValue({});
        prismaMock.integrationSyncRun.create.mockResolvedValue({});
        axiosMock.get.mockResolvedValueOnce({
            data: {
                CDCResponse: [
                    {
                        QueryResponse: [
                            {
                                Account: [
                                    {
                                        Id: 'bank-deleted',
                                        Name: 'Old Bank',
                                        AccountType: 'Bank',
                                        status: 'Deleted',
                                        SyncToken: '8',
                                    },
                                    {
                                        Id: 'category-inactive',
                                        Name: 'Inactive Category',
                                        AccountType: 'Expense',
                                        Active: false,
                                        SyncToken: '9',
                                    },
                                ],
                            },
                            {
                                Vendor: [
                                    {
                                        Id: 'vendor-inactive',
                                        DisplayName: 'Dormant Vendor',
                                        Active: false,
                                        SyncToken: '10',
                                    },
                                ],
                            },
                        ],
                    },
                ],
                time: '2026-06-11T09:30:00.000Z',
            },
        });

        const result = await QuickBooksReferenceSyncService.syncReferenceData({
            trigger: 'MANUAL',
            userId: 'user-1',
        });

        expect(result).toMatchObject({
            status: 'SUCCESS',
            totalReceived: 3,
            createdCount: 0,
            updatedCount: 3,
            deletedCount: 3,
        });
        expect(axiosMock.get).toHaveBeenCalledWith(
            expect.stringContaining('/cdc'),
            expect.objectContaining({
                params: expect.objectContaining({
                    entities: 'Account,Vendor',
                    changedSince: expect.any(String),
                    minorversion: '75',
                }),
            })
        );
        expect(prismaMock.quickBooksBankAccount.update).toHaveBeenCalledWith({
            where: { id: 'bank-existing' },
            data: expect.objectContaining({
                active: false,
                syncToken: '8',
                deletedAt: expect.any(Date),
            }),
        });
        expect(prismaMock.quickBooksLineItemCategory.update).toHaveBeenCalledWith({
            where: { id: 'category-existing' },
            data: expect.objectContaining({
                active: false,
                syncToken: '9',
            }),
        });
        expect(prismaMock.quickBooksPayee.update).toHaveBeenCalledWith({
            where: { id: 'payee-existing' },
            data: expect.objectContaining({
                displayName: 'Dormant Vendor',
                active: false,
                syncToken: '10',
            }),
        });
    });

    test('records partial sync when CDC fails for CDC entities but full sync entities can succeed', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        const watermark = new Date(Date.now() - 60 * 60 * 1000);
        prismaMock.quickBooksConnection.findFirst.mockResolvedValue(await makeConnection());
        prismaMock.quickBooksConnection.update.mockResolvedValue({});
        prismaMock.quickBooksReferenceSyncLock.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.quickBooksReferenceSyncLock.create.mockResolvedValue({});
        prismaMock.quickBooksReferenceSyncState.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ entity: 'PAYEE', cdcWatermark: watermark });
        prismaMock.quickBooksReferenceSyncState.upsert.mockResolvedValue({});
        prismaMock.quickBooksBankAccount.findUnique.mockResolvedValue(null);
        prismaMock.quickBooksLineItemCategory.findUnique.mockResolvedValue(null);
        prismaMock.quickBooksBankAccount.create.mockResolvedValue({});
        prismaMock.quickBooksLineItemCategory.create.mockResolvedValue({});
        prismaMock.integrationSyncRun.create.mockResolvedValue({});
        axiosMock.get
            .mockRejectedValueOnce({
                isAxiosError: true,
                response: {
                    status: 500,
                    data: { Fault: { Error: [{ Message: 'CDC unavailable' }] } },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    QueryResponse: {
                        Account: [
                            {
                                Id: 'bank-1',
                                Name: 'Checking',
                                AccountType: 'Bank',
                                Active: true,
                            },
                            {
                                Id: 'cat-1',
                                Name: 'Supplies',
                                AccountType: 'Expense',
                                Active: true,
                            },
                        ],
                    },
                },
            });

        const result = await QuickBooksReferenceSyncService.syncReferenceData({
            trigger: 'MANUAL',
            userId: 'user-1',
        });

        expect(result).toMatchObject({
            status: 'PARTIAL',
            totalReceived: 2,
            createdCount: 2,
            updatedCount: 0,
            deletedCount: 0,
        });
        expect(result?.entities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ entity: 'BANK_ACCOUNT', status: 'SUCCESS' }),
                expect.objectContaining({ entity: 'LINE_ITEM_CATEGORY', status: 'SUCCESS' }),
                expect.objectContaining({
                    entity: 'PAYEE',
                    status: 'FAILED',
                    error: 'CDC unavailable',
                }),
            ])
        );
        expect(prismaMock.integrationSyncRun.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                status: 'PARTIAL',
                attempted: 3,
                succeeded: 2,
                failed: 1,
                error: 'PAYEE: CDC unavailable',
            }),
        });
    });

    test('rejects a manual sync when another QuickBooks reference sync is already running', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValueOnce(await makeConnection());
        prismaMock.quickBooksReferenceSyncLock.deleteMany.mockResolvedValueOnce({ count: 0 });
        prismaMock.quickBooksReferenceSyncLock.create.mockRejectedValueOnce(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: 'test',
            })
        );

        await expect(QuickBooksReferenceSyncService.syncReferenceData()).rejects.toThrow(
            'QuickBooks reference sync is already running.'
        );
        expect(axiosMock.get).not.toHaveBeenCalled();
    });

    test('skips scheduled sync when auto daily sync is disabled', async () => {
        const { QuickBooksReferenceSyncService } = await import('./reference-sync-service.js');
        prismaMock.quickBooksConnection.findFirst.mockResolvedValue(
            await makeConnection({ referenceAutoSyncEnabled: false })
        );

        await expect(
            QuickBooksReferenceSyncService.syncReferenceData({
                trigger: 'SCHEDULED',
                requireAutoEnabled: true,
            })
        ).resolves.toBeNull();
        expect(axiosMock.get).not.toHaveBeenCalled();
    });
});
