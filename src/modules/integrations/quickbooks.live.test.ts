import { describe, expect, test } from 'bun:test';
import 'dotenv/config';

import { QuickBooksClient } from './quickbooks-client';
import { QuickBooksReferenceSyncService } from './reference-sync-service';
import { QuickBooksService } from './service';

const LIVE_ENABLED = process.env.QUICKBOOKS_LIVE_TESTS === '1';
const LIVE_MUTATIONS_ENABLED = LIVE_ENABLED && process.env.QUICKBOOKS_LIVE_MUTATION_TESTS === '1';
const liveTest = LIVE_ENABLED ? test : test.skip;
const liveMutationTest = LIVE_MUTATIONS_ENABLED ? test : test.skip;

type QuickBooksAccountRecord = {
    Id: string;
    SyncToken: string;
    Name?: string;
    FullyQualifiedName?: string;
    AccountType?: string;
    Active?: boolean;
};

type QuickBooksVendorRecord = {
    Id: string;
    SyncToken: string;
    DisplayName?: string;
    CompanyName?: string;
    Active?: boolean;
};

const getLiveConfig = async () => {
    const realmId = process.env.QUICKBOOKS_LIVE_REALM_ID?.trim();
    const accessToken = process.env.QUICKBOOKS_LIVE_ACCESS_TOKEN?.trim();

    if (realmId && accessToken) return { realmId, accessToken };

    const [{ prisma }, { getValidQuickBooksAccessToken }] = await Promise.all([
        import('../../lib/prisma.js'),
        import('./quickbooks-token-helper.js'),
    ]);
    const connection = await prisma.quickBooksConnection.findFirst({
        where: { status: 'CONNECTED', disconnectedAt: null },
        orderBy: { updatedAt: 'desc' },
    });

    if (!connection) {
        throw new Error(
            'Missing QUICKBOOKS_LIVE_REALM_ID/QUICKBOOKS_LIVE_ACCESS_TOKEN and no active QuickBooksConnection row was found.'
        );
    }

    return {
        realmId: connection.realmId,
        accessToken: await getValidQuickBooksAccessToken(connection),
    };
};

const getQuickBooksApiBaseUrl = () =>
    process.env.QUICKBOOKS_ENVIRONMENT?.trim().toLowerCase() === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com';

const qboPost = async <T>(
    realmId: string,
    accessToken: string,
    entity: 'account' | 'vendor',
    body: Record<string, unknown>
): Promise<T> => {
    const url = new URL(
        `/v3/company/${encodeURIComponent(realmId)}/${entity}`,
        getQuickBooksApiBaseUrl()
    );
    url.searchParams.set('minorversion', process.env.QUICKBOOKS_MINOR_VERSION?.trim() || '75');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
        throw new Error(
            `QuickBooks ${entity} mutation failed (${response.status}): ${JSON.stringify(data)}`
        );
    }

    return data as T;
};

const createAccount = async (
    realmId: string,
    accessToken: string,
    input: {
        name: string;
        accountType: 'Bank' | 'Expense';
        accountSubType?: string;
    }
) => {
    const data = await qboPost<{ Account: QuickBooksAccountRecord }>(
        realmId,
        accessToken,
        'account',
        {
            Name: input.name,
            AccountType: input.accountType,
            ...(input.accountSubType ? { AccountSubType: input.accountSubType } : {}),
        }
    );

    return data.Account;
};

const updateAccount = async (
    realmId: string,
    accessToken: string,
    account: QuickBooksAccountRecord,
    changes: Record<string, unknown>
) => {
    const data = await qboPost<{ Account: QuickBooksAccountRecord }>(
        realmId,
        accessToken,
        'account',
        {
            Id: account.Id,
            SyncToken: account.SyncToken,
            sparse: true,
            ...changes,
        }
    );

    return data.Account;
};

const createVendor = async (realmId: string, accessToken: string, displayName: string) => {
    const data = await qboPost<{ Vendor: QuickBooksVendorRecord }>(realmId, accessToken, 'vendor', {
        DisplayName: displayName,
        CompanyName: displayName,
        PrimaryEmailAddr: {
            Address: `${displayName.toLowerCase().replaceAll(/[^a-z0-9]+/g, '.')}@example.test`,
        },
    });

    return data.Vendor;
};

const updateVendor = async (
    realmId: string,
    accessToken: string,
    vendor: QuickBooksVendorRecord,
    changes: Record<string, unknown>
) => {
    const data = await qboPost<{ Vendor: QuickBooksVendorRecord }>(realmId, accessToken, 'vendor', {
        Id: vendor.Id,
        SyncToken: vendor.SyncToken,
        sparse: true,
        ...changes,
    });

    return data.Vendor;
};

const getRowById = <T extends { Id?: unknown }>(rows: T[] | undefined, id: string) =>
    rows?.find((row) => row.Id === id);

describe('QuickBooks live Intuit smoke tests', () => {
    if (!LIVE_ENABLED) {
        test('skipped unless QUICKBOOKS_LIVE_TESTS=1 is set', () => {
            expect(LIVE_ENABLED).toBe(false);
        });
    }

    if (LIVE_ENABLED && !LIVE_MUTATIONS_ENABLED) {
        test('CDC mutation tests skipped unless QUICKBOOKS_LIVE_MUTATION_TESTS=1 is set', () => {
            expect(LIVE_MUTATIONS_ENABLED).toBe(false);
        });
    }

    liveTest('reads company info from the live QuickBooks company', async () => {
        const { realmId, accessToken } = await getLiveConfig();

        const company = await QuickBooksClient.getCompanyInfo(realmId, accessToken);

        expect(company.id === null || typeof company.id === 'string').toBe(true);
        expect(company.name === null || typeof company.name === 'string').toBe(true);
    });

    liveTest('reads backend QuickBooks status from the stored DB connection', async () => {
        const status = await QuickBooksService.getStatus();

        expect(status.configured).toBe(true);
        expect(status.environment).toBe('sandbox');
        expect(status.connection).toMatchObject({
            environment: 'sandbox',
            status: 'CONNECTED',
            tokenHealth: expect.any(String),
        });
        expect(status.connection?.realmId).toBeTruthy();
        expect(
            status.connection?.companyName === null ||
                typeof status.connection?.companyName === 'string'
        ).toBe(true);
    });

    liveTest('queries live QuickBooks bank account candidates without mutating data', async () => {
        const { realmId, accessToken } = await getLiveConfig();

        const rows = await QuickBooksClient.queryEntity(
            realmId,
            accessToken,
            'Account',
            'SELECT * FROM Account WHERE Active IN (true, false) STARTPOSITION 1 MAXRESULTS 5'
        );

        expect(Array.isArray(rows)).toBe(true);
        for (const row of rows) {
            expect(typeof row).toBe('object');
            expect(row).not.toBeNull();
        }
    });

    liveTest('queries live QuickBooks vendor/payee candidates without mutating data', async () => {
        const { realmId, accessToken } = await getLiveConfig();

        const rows = await QuickBooksClient.queryEntity(
            realmId,
            accessToken,
            'Vendor',
            'SELECT * FROM Vendor WHERE Active IN (true, false) STARTPOSITION 1 MAXRESULTS 5'
        );

        expect(Array.isArray(rows)).toBe(true);
        for (const row of rows) {
            expect(typeof row).toBe('object');
            expect(row).not.toBeNull();
        }
    });

    liveTest('runs read-only live CDC for Account and Vendor entities', async () => {
        const { realmId, accessToken } = await getLiveConfig();
        const changedSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const result = await QuickBooksClient.changeDataCapture(
            realmId,
            accessToken,
            ['Account', 'Vendor'],
            changedSince
        );

        expect(Array.isArray(result.rowsByEntity.Account)).toBe(true);
        expect(Array.isArray(result.rowsByEntity.Vendor)).toBe(true);
        expect(new Date(result.responseTime).toString()).not.toBe('Invalid Date');
    });

    liveTest('runs backend live reference sync using the stored DB connection', async () => {
        const result = await QuickBooksReferenceSyncService.syncReferenceData({
            trigger: 'MANUAL',
            userId: undefined,
        });

        expect(result).not.toBeNull();
        expect(['SUCCESS', 'PARTIAL']).toContain(result?.status);
        expect(result?.provider).toBe('quickbooks');
        expect(result?.entities.map((entity) => entity.entity).sort()).toEqual([
            'BANK_ACCOUNT',
            'LINE_ITEM_CATEGORY',
            'PAYEE',
        ]);
        expect(typeof result?.totalReceived).toBe('number');
        expect(typeof result?.createdCount).toBe('number');
        expect(typeof result?.updatedCount).toBe('number');
        expect(typeof result?.deletedCount).toBe('number');
    });

    liveTest(
        'lists locally synced QuickBooks bank accounts, categories, and vendors after live sync',
        async () => {
            const [bankAccounts, categories, payees] = await Promise.all([
                QuickBooksReferenceSyncService.listBankAccounts({ includeInactive: true }),
                QuickBooksReferenceSyncService.listLineItemCategories({ includeInactive: true }),
                QuickBooksReferenceSyncService.listPayees({ includeInactive: true }),
            ]);

            expect(Array.isArray(bankAccounts)).toBe(true);
            expect(Array.isArray(categories)).toBe(true);
            expect(Array.isArray(payees)).toBe(true);

            for (const account of bankAccounts) {
                expect(account.realmId).toBeTruthy();
                expect(account.qbId).toBeTruthy();
                expect(account.name).toBeTruthy();
            }
            for (const category of categories) {
                expect(category.realmId).toBeTruthy();
                expect(category.qbId).toBeTruthy();
                expect(category.name).toBeTruthy();
            }
            for (const payee of payees) {
                expect(payee.realmId).toBeTruthy();
                expect(payee.qbId).toBeTruthy();
                expect(payee.displayName).toBeTruthy();
            }
        }
    );

    liveMutationTest(
        'captures sandbox edits and deletions for bank accounts, categories, and vendors through CDC and local sync',
        async () => {
            const { realmId, accessToken } = await getLiveConfig();
            const changedSince = new Date(Date.now() - 2 * 60 * 1000);
            const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            const bankEdit = await createAccount(realmId, accessToken, {
                name: `CDC Test Bank Edit ${suffix}`,
                accountType: 'Bank',
                accountSubType: 'Checking',
            });
            const bankDelete = await createAccount(realmId, accessToken, {
                name: `CDC Test Bank Delete ${suffix}`,
                accountType: 'Bank',
                accountSubType: 'Checking',
            });
            const categoryEdit = await createAccount(realmId, accessToken, {
                name: `CDC Test Category Edit ${suffix}`,
                accountType: 'Expense',
            });
            const categoryDelete = await createAccount(realmId, accessToken, {
                name: `CDC Test Category Delete ${suffix}`,
                accountType: 'Expense',
            });
            const vendorEdit = await createVendor(
                realmId,
                accessToken,
                `CDC Test Vendor Edit ${suffix}`
            );
            const vendorDelete = await createVendor(
                realmId,
                accessToken,
                `CDC Test Vendor Delete ${suffix}`
            );

            const updatedBankName = `CDC Test Bank Edited ${suffix}`;
            const updatedCategoryName = `CDC Test Category Edited ${suffix}`;
            const updatedVendorCompany = `CDC Test Vendor Edited LLC ${suffix}`;

            await updateAccount(realmId, accessToken, bankEdit, { Name: updatedBankName });
            await updateAccount(realmId, accessToken, bankDelete, { Active: false });
            await updateAccount(realmId, accessToken, categoryEdit, { Name: updatedCategoryName });
            await updateAccount(realmId, accessToken, categoryDelete, { Active: false });
            await updateVendor(realmId, accessToken, vendorEdit, {
                CompanyName: updatedVendorCompany,
            });
            await updateVendor(realmId, accessToken, vendorDelete, { Active: false });

            const cdc = await QuickBooksClient.changeDataCapture(
                realmId,
                accessToken,
                ['Account', 'Vendor'],
                changedSince
            );
            const accountRows = cdc.rowsByEntity.Account as QuickBooksAccountRecord[];
            const vendorRows = cdc.rowsByEntity.Vendor as QuickBooksVendorRecord[];

            expect(getRowById(accountRows, bankEdit.Id)).toMatchObject({
                Id: bankEdit.Id,
                Name: updatedBankName,
                AccountType: 'Bank',
            });
            expect(getRowById(accountRows, bankDelete.Id)).toMatchObject({
                Id: bankDelete.Id,
                AccountType: 'Bank',
                Active: false,
            });
            expect(getRowById(accountRows, categoryEdit.Id)).toMatchObject({
                Id: categoryEdit.Id,
                Name: updatedCategoryName,
                AccountType: 'Expense',
            });
            expect(getRowById(accountRows, categoryDelete.Id)).toMatchObject({
                Id: categoryDelete.Id,
                AccountType: 'Expense',
                Active: false,
            });
            expect(getRowById(vendorRows, vendorEdit.Id)).toMatchObject({
                Id: vendorEdit.Id,
                CompanyName: updatedVendorCompany,
            });
            expect(getRowById(vendorRows, vendorDelete.Id)).toMatchObject({
                Id: vendorDelete.Id,
                Active: false,
            });

            const sync = await QuickBooksReferenceSyncService.syncReferenceData({
                trigger: 'MANUAL',
                userId: undefined,
            });
            expect(sync?.status).toBe('SUCCESS');

            const [bankAccounts, categories, payees] = await Promise.all([
                QuickBooksReferenceSyncService.listBankAccounts({ includeInactive: true }),
                QuickBooksReferenceSyncService.listLineItemCategories({ includeInactive: true }),
                QuickBooksReferenceSyncService.listPayees({ includeInactive: true }),
            ]);
            const localBankEdit = bankAccounts.find((row) => row.qbId === bankEdit.Id);
            const localBankDelete = bankAccounts.find((row) => row.qbId === bankDelete.Id);
            const localCategoryEdit = categories.find((row) => row.qbId === categoryEdit.Id);
            const localCategoryDelete = categories.find((row) => row.qbId === categoryDelete.Id);
            const localVendorEdit = payees.find((row) => row.qbId === vendorEdit.Id);
            const localVendorDelete = payees.find((row) => row.qbId === vendorDelete.Id);

            expect(localBankEdit).toMatchObject({
                qbId: bankEdit.Id,
                name: updatedBankName,
                active: true,
            });
            expect(localBankDelete).toMatchObject({ qbId: bankDelete.Id, active: false });
            expect(localCategoryEdit).toMatchObject({
                qbId: categoryEdit.Id,
                name: updatedCategoryName,
                active: true,
            });
            expect(localCategoryDelete).toMatchObject({ qbId: categoryDelete.Id, active: false });
            expect(localVendorEdit).toMatchObject({
                qbId: vendorEdit.Id,
                companyName: updatedVendorCompany,
                active: true,
            });
            expect(localVendorDelete).toMatchObject({ qbId: vendorDelete.Id, active: false });
        },
        60_000
    );
});
