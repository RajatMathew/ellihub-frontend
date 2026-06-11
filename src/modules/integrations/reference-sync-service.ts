import {
    Prisma,
    QuickBooksConnection,
    QuickBooksReferenceEntity,
    QuickBooksReferenceSyncStatus,
} from '@db/client';
import { prisma } from '@lib/prisma';
import { BadRequestError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';

import {
    getQuickBooksClientErrorMessage,
    QuickBooksCdcResponse,
    QuickBooksClient,
    QuickBooksEntityName,
} from './quickbooks-client';
import { getValidQuickBooksAccessToken } from './quickbooks-token-helper';

const QUICKBOOKS_REFERENCE_PROVIDER = 'quickbooks';
const QUICKBOOKS_REFERENCE_SCOPE = 'reference-data';
const FULL_SYNC_PAGE_SIZE = 1000;
const FULL_SYNC_MAX_PAGES = 100;
const CDC_SAFE_WINDOW_MS = 29 * 24 * 60 * 60 * 1000;
const CDC_OVERLAP_WINDOW_MS = 2 * 60 * 1000;
const LOCK_TTL_MS = 30 * 60 * 1000;
const ACCOUNT_FULL_SYNC_QUERY = 'SELECT * FROM Account WHERE Active IN (true, false)';
const VENDOR_FULL_SYNC_QUERY = 'SELECT * FROM Vendor WHERE Active IN (true, false)';
const LINE_ITEM_CATEGORY_ACCOUNT_TYPES = new Set([
    'Expense',
    'Cost of Goods Sold',
    'Other Expense',
]);

type SyncTrigger = 'MANUAL' | 'SCHEDULED';
type SyncMode = 'FULL' | 'CDC';
type SyncCounts = {
    totalReceived: number;
    createdCount: number;
    updatedCount: number;
    deletedCount: number;
};
type ReferenceEntityResult = SyncCounts & {
    entity: QuickBooksReferenceEntity;
    mode: SyncMode;
    status: QuickBooksReferenceSyncStatus;
    syncedAt: string | null;
    error: string | null;
};
type ReferenceSyncResult = SyncCounts & {
    provider: 'quickbooks';
    trigger: SyncTrigger;
    startedAt: string;
    finishedAt: string;
    status: QuickBooksReferenceSyncStatus;
    entities: ReferenceEntityResult[];
};
type ReferenceSyncOverview = {
    provider: 'quickbooks';
    connected: boolean;
    autoDailySyncEnabled: boolean;
    lastSyncedAt: string | null;
    lastSyncStatus: QuickBooksReferenceSyncStatus | null;
    lastSyncError: string | null;
    totals: SyncCounts;
    entities: Array<
        SyncCounts & {
            entity: QuickBooksReferenceEntity;
            lastFullSyncedAt: string | null;
            lastCdcSyncedAt: string | null;
            cdcWatermark: string | null;
            lastSyncStatus: QuickBooksReferenceSyncStatus | null;
            lastSyncError: string | null;
        }
    >;
};
type QuickBooksBankAccountOption = {
    id: string;
    realmId: string;
    qbId: string;
    name: string;
    fullyQualifiedName: string | null;
    accountSubType: string | null;
    currencyCode: string | null;
    active: boolean | null;
    deletedAt: string | null;
};
type QuickBooksLineItemCategoryOption = {
    id: string;
    realmId: string;
    qbId: string;
    name: string;
    fullyQualifiedName: string | null;
    accountType: string | null;
    accountSubType: string | null;
    currencyCode: string | null;
    active: boolean | null;
    deletedAt: string | null;
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
type ReferenceState = Awaited<ReturnType<typeof getState>>;
type AccountApplyResult = {
    bankAccounts: SyncCounts;
    lineItemCategories: SyncCounts;
};

const emptyCounts: SyncCounts = {
    totalReceived: 0,
    createdCount: 0,
    updatedCount: 0,
    deletedCount: 0,
};

const addCounts = (a: SyncCounts, b: SyncCounts): SyncCounts => ({
    totalReceived: a.totalReceived + b.totalReceived,
    createdCount: a.createdCount + b.createdCount,
    updatedCount: a.updatedCount + b.updatedCount,
    deletedCount: a.deletedCount + b.deletedCount,
});

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
    JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const getString = (record: Record<string, unknown>, key: string): string | null => {
    const value = record[key];
    return typeof value === 'string' && value.trim() ? value : null;
};

const getBoolean = (record: Record<string, unknown>, key: string): boolean | null => {
    const value = record[key];
    return typeof value === 'boolean' ? value : null;
};

const getDecimalString = (record: Record<string, unknown>, key: string): string | null => {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value.toString();
    if (typeof value === 'string' && value.trim()) return value;
    return null;
};

const getRecord = (
    record: Record<string, unknown>,
    key: string
): Record<string, unknown> | null => {
    const value = record[key];
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
};

const getNestedString = (record: Record<string, unknown>, key: string, nestedKey: string) => {
    const nested = getRecord(record, key);
    return nested ? getString(nested, nestedKey) : null;
};

const getQuickBooksMetadataDate = (
    record: Record<string, unknown>,
    key: 'CreateTime' | 'LastUpdatedTime'
): Date | null => {
    const metadata = getRecord(record, 'MetaData') ?? getRecord(record, 'Metadata');
    const value = metadata ? getString(metadata, key) : null;
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isDeletedRecord = (record: Record<string, unknown>) =>
    getString(record, 'status')?.toLowerCase() === 'deleted';

const isInactiveRecord = (record: Record<string, unknown>) =>
    isDeletedRecord(record) || getBoolean(record, 'Active') === false;

const isBankAccount = (record: Record<string, unknown>) =>
    getString(record, 'AccountType') === 'Bank';

const isLineItemCategoryAccount = (record: Record<string, unknown>) => {
    const accountType = getString(record, 'AccountType');
    return accountType ? LINE_ITEM_CATEGORY_ACCOUNT_TYPES.has(accountType) : false;
};

const subtractCdcOverlap = (date: Date): Date =>
    new Date(Math.max(0, date.getTime() - CDC_OVERLAP_WINDOW_MS));

const getActiveConnection = async (): Promise<QuickBooksConnection | null> => {
    return await prisma.quickBooksConnection.findFirst({
        where: { status: 'CONNECTED', disconnectedAt: null },
        orderBy: { updatedAt: 'desc' },
    });
};

const getActiveConnectionOrThrow = async (): Promise<QuickBooksConnection> => {
    const connection = await getActiveConnection();
    if (!connection) throw new NotFoundError('QuickBooks is not connected');

    return connection;
};

const getState = async (realmId: string, entity: QuickBooksReferenceEntity) =>
    await prisma.quickBooksReferenceSyncState.findUnique({
        where: { realmId_entity: { realmId, entity } },
    });

const shouldRunFullSync = (state: ReferenceState): boolean => {
    if (!state?.cdcWatermark) return true;
    return Date.now() - state.cdcWatermark.getTime() > CDC_SAFE_WINDOW_MS;
};

const getGroupMode = (states: ReferenceState[]): SyncMode =>
    states.some((state) => shouldRunFullSync(state)) ? 'FULL' : 'CDC';

const getEarliestWatermark = (states: ReferenceState[]): Date => {
    const times = states
        .map((state) => state?.cdcWatermark?.getTime())
        .filter((value): value is number => typeof value === 'number');

    return new Date(Math.min(...times));
};

const parseCdcResponseTime = (cdcResponse: QuickBooksCdcResponse | null, fallback: Date): Date => {
    if (!cdcResponse) return fallback;

    const parsed = new Date(cdcResponse.responseTime);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const activeReferenceWhere = (includeInactive: boolean) =>
    includeInactive
        ? {}
        : {
              deletedAt: null,
              OR: [{ active: true }, { active: null }],
          };

const getAccountMetadata = (record: Record<string, unknown>, syncedAt: Date) => ({
    name:
        getString(record, 'Name') ??
        getString(record, 'FullyQualifiedName') ??
        getString(record, 'Id') ??
        'Account',
    fullyQualifiedName: getString(record, 'FullyQualifiedName'),
    classification: getString(record, 'Classification'),
    accountType: getString(record, 'AccountType'),
    accountSubType: getString(record, 'AccountSubType'),
    currentBalance: getDecimalString(record, 'CurrentBalance'),
    currentBalanceWithSubAccounts: getDecimalString(record, 'CurrentBalanceWithSubAccounts'),
    currencyCode: getNestedString(record, 'CurrencyRef', 'value'),
    active: getBoolean(record, 'Active') ?? !isDeletedRecord(record),
    syncToken: getString(record, 'SyncToken'),
    quickBooksCreatedAt: getQuickBooksMetadataDate(record, 'CreateTime'),
    quickBooksUpdatedAt: getQuickBooksMetadataDate(record, 'LastUpdatedTime'),
    lastSyncedAt: syncedAt,
    raw: toJsonValue(record),
});

const getReceivedInactiveCounts = (exists: boolean, inactive: boolean): SyncCounts => ({
    totalReceived: 1,
    createdCount: exists ? 0 : 1,
    updatedCount: exists ? 1 : 0,
    deletedCount: inactive ? 1 : 0,
});

const getDeletedAtValue = (
    record: Record<string, unknown>,
    existingDeletedAt: Date | null | undefined,
    syncedAt: Date
) => {
    if (isDeletedRecord(record)) return existingDeletedAt ?? syncedAt;
    return null;
};

const markExistingReferenceInactive = async (
    tx: Prisma.TransactionClient,
    table: 'quickBooksBankAccount' | 'quickBooksLineItemCategory',
    id: string,
    record: Record<string, unknown>,
    syncedAt: Date,
    existingDeletedAt?: Date | null
) => {
    await tx[table].update({
        where: { id },
        data: {
            active: false,
            syncToken: getString(record, 'SyncToken'),
            quickBooksUpdatedAt: getQuickBooksMetadataDate(record, 'LastUpdatedTime'),
            lastSyncedAt: syncedAt,
            deletedAt: getDeletedAtValue(record, existingDeletedAt, syncedAt),
            raw: toJsonValue(record),
        },
    });
};

const upsertBankAccount = async (
    tx: Prisma.TransactionClient,
    connection: QuickBooksConnection,
    record: Record<string, unknown>,
    syncedAt: Date
): Promise<SyncCounts> => {
    const quickBooksId = getString(record, 'Id');
    if (!quickBooksId) return emptyCounts;

    const existing = await tx.quickBooksBankAccount.findUnique({
        where: { realmId_quickBooksId: { realmId: connection.realmId, quickBooksId } },
    });

    if (!isBankAccount(record) || isDeletedRecord(record)) {
        if (!existing) return emptyCounts;
        await markExistingReferenceInactive(
            tx,
            'quickBooksBankAccount',
            existing.id,
            record,
            syncedAt,
            existing.deletedAt
        );
        return { totalReceived: 1, createdCount: 0, updatedCount: 1, deletedCount: 1 };
    }

    const inactive = isInactiveRecord(record);
    const data = {
        connectionId: connection.id,
        realmId: connection.realmId,
        quickBooksId,
        ...getAccountMetadata(record, syncedAt),
        deletedAt: getDeletedAtValue(record, existing?.deletedAt, syncedAt),
    };

    if (existing) {
        await tx.quickBooksBankAccount.update({ where: { id: existing.id }, data });
        return getReceivedInactiveCounts(true, inactive);
    }

    await tx.quickBooksBankAccount.create({ data: { ...data, id: generateNanoId() } });
    return getReceivedInactiveCounts(false, inactive);
};

const upsertLineItemCategory = async (
    tx: Prisma.TransactionClient,
    connection: QuickBooksConnection,
    record: Record<string, unknown>,
    syncedAt: Date
): Promise<SyncCounts> => {
    const quickBooksId = getString(record, 'Id');
    if (!quickBooksId) return emptyCounts;

    const existing = await tx.quickBooksLineItemCategory.findUnique({
        where: { realmId_quickBooksId: { realmId: connection.realmId, quickBooksId } },
    });

    if (!isLineItemCategoryAccount(record) || isDeletedRecord(record)) {
        if (!existing) return emptyCounts;
        await markExistingReferenceInactive(
            tx,
            'quickBooksLineItemCategory',
            existing.id,
            record,
            syncedAt,
            existing.deletedAt
        );
        return { totalReceived: 1, createdCount: 0, updatedCount: 1, deletedCount: 1 };
    }

    const inactive = isInactiveRecord(record);
    const data = {
        connectionId: connection.id,
        realmId: connection.realmId,
        quickBooksId,
        ...getAccountMetadata(record, syncedAt),
        description: getString(record, 'Description'),
        deletedAt: getDeletedAtValue(record, existing?.deletedAt, syncedAt),
    };

    if (existing) {
        await tx.quickBooksLineItemCategory.update({ where: { id: existing.id }, data });
        return getReceivedInactiveCounts(true, inactive);
    }

    await tx.quickBooksLineItemCategory.create({ data: { ...data, id: generateNanoId() } });
    return getReceivedInactiveCounts(false, inactive);
};

const upsertPayee = async (
    tx: Prisma.TransactionClient,
    connection: QuickBooksConnection,
    record: Record<string, unknown>,
    syncedAt: Date
): Promise<SyncCounts> => {
    const quickBooksId = getString(record, 'Id');
    if (!quickBooksId) return emptyCounts;

    const existing = await tx.quickBooksPayee.findUnique({
        where: { realmId_quickBooksId: { realmId: connection.realmId, quickBooksId } },
    });
    const inactive = isInactiveRecord(record);
    const data = {
        connectionId: connection.id,
        realmId: connection.realmId,
        quickBooksId,
        displayName:
            getString(record, 'DisplayName') ??
            getString(record, 'CompanyName') ??
            getString(record, 'PrintOnCheckName') ??
            quickBooksId,
        companyName: getString(record, 'CompanyName'),
        givenName: getString(record, 'GivenName'),
        familyName: getString(record, 'FamilyName'),
        primaryEmail: getNestedString(record, 'PrimaryEmailAddr', 'Address'),
        primaryPhone: getNestedString(record, 'PrimaryPhone', 'FreeFormNumber'),
        active: getBoolean(record, 'Active') ?? !isDeletedRecord(record),
        syncToken: getString(record, 'SyncToken'),
        quickBooksUpdatedAt: getQuickBooksMetadataDate(record, 'LastUpdatedTime'),
        deletedAt: getDeletedAtValue(record, existing?.deletedAt, syncedAt),
        raw: toJsonValue(record),
    };

    if (existing) {
        await tx.quickBooksPayee.update({ where: { id: existing.id }, data });
        return getReceivedInactiveCounts(true, inactive);
    }

    await tx.quickBooksPayee.create({ data: { ...data, id: generateNanoId() } });
    return getReceivedInactiveCounts(false, inactive);
};

const applyAccountRows = async (
    tx: Prisma.TransactionClient,
    connection: QuickBooksConnection,
    rows: Array<Record<string, unknown>>,
    syncedAt: Date
): Promise<AccountApplyResult> => {
    let bankAccounts = emptyCounts;
    let lineItemCategories = emptyCounts;

    for (const row of rows) {
        bankAccounts = addCounts(
            bankAccounts,
            await upsertBankAccount(tx, connection, row, syncedAt)
        );
        lineItemCategories = addCounts(
            lineItemCategories,
            await upsertLineItemCategory(tx, connection, row, syncedAt)
        );
    }

    return { bankAccounts, lineItemCategories };
};

const applyPayeeRows = async (
    tx: Prisma.TransactionClient,
    connection: QuickBooksConnection,
    rows: Array<Record<string, unknown>>,
    syncedAt: Date
): Promise<SyncCounts> => {
    let counts = emptyCounts;
    for (const row of rows)
        counts = addCounts(counts, await upsertPayee(tx, connection, row, syncedAt));
    return counts;
};

const fetchFullSyncRows = async (
    connection: QuickBooksConnection,
    accessToken: string,
    entity: QuickBooksEntityName,
    fullSyncQuery: string
): Promise<Array<Record<string, unknown>>> => {
    const rows: Array<Record<string, unknown>> = [];

    for (let page = 0; page < FULL_SYNC_MAX_PAGES; page += 1) {
        const startPosition = page * FULL_SYNC_PAGE_SIZE + 1;
        const pageRows = await QuickBooksClient.queryEntity(
            connection.realmId,
            accessToken,
            entity,
            `${fullSyncQuery} STARTPOSITION ${startPosition} MAXRESULTS ${FULL_SYNC_PAGE_SIZE}`
        );
        rows.push(...pageRows);

        if (pageRows.length < FULL_SYNC_PAGE_SIZE) return rows;
    }

    throw new BadRequestError(`QuickBooks ${entity} full sync exceeded page safety limit`);
};

const saveEntityState = async (
    tx: Prisma.TransactionClient,
    connection: QuickBooksConnection,
    entity: QuickBooksReferenceEntity,
    mode: SyncMode,
    counts: SyncCounts,
    syncedAt: Date,
    cdcWatermark: Date,
    status: QuickBooksReferenceSyncStatus,
    error: string | null
) => {
    await tx.quickBooksReferenceSyncState.upsert({
        where: { realmId_entity: { realmId: connection.realmId, entity } },
        create: {
            id: generateNanoId(),
            connectionId: connection.id,
            realmId: connection.realmId,
            entity,
            lastFullSyncedAt: mode === 'FULL' ? syncedAt : null,
            lastCdcSyncedAt: mode === 'CDC' ? syncedAt : null,
            cdcWatermark,
            lastSyncStatus: status,
            lastSyncError: error,
            ...counts,
        },
        update: {
            connectionId: connection.id,
            ...(mode === 'FULL' ? { lastFullSyncedAt: syncedAt } : { lastCdcSyncedAt: syncedAt }),
            cdcWatermark,
            lastSyncStatus: status,
            lastSyncError: error,
            ...counts,
        },
    });
};

const saveEntityFailure = async (
    connection: QuickBooksConnection,
    entity: QuickBooksReferenceEntity,
    message: string
) => {
    await prisma.quickBooksReferenceSyncState.upsert({
        where: { realmId_entity: { realmId: connection.realmId, entity } },
        create: {
            id: generateNanoId(),
            connectionId: connection.id,
            realmId: connection.realmId,
            entity,
            lastSyncStatus: 'FAILED',
            lastSyncError: message,
        },
        update: {
            connectionId: connection.id,
            lastSyncStatus: 'FAILED',
            lastSyncError: message,
        },
    });
};

const toResult = (
    entity: QuickBooksReferenceEntity,
    mode: SyncMode,
    status: QuickBooksReferenceSyncStatus,
    counts: SyncCounts,
    syncedAt: Date | null,
    error: string | null
): ReferenceEntityResult => ({
    entity,
    mode,
    status,
    syncedAt: syncedAt?.toISOString() ?? null,
    error,
    ...counts,
});

const getErrorMessage = (error: unknown, fallback: string) =>
    getQuickBooksClientErrorMessage(error) ?? (error instanceof Error ? error.message : fallback);

const syncAccounts = async ({
    connection,
    accessToken,
    mode,
    cdcRows,
    nextWatermark,
    startedAt,
    cdcError,
}: {
    connection: QuickBooksConnection;
    accessToken: string;
    mode: SyncMode;
    cdcRows: Array<Record<string, unknown>>;
    nextWatermark: Date;
    startedAt: Date;
    cdcError: string | null;
}): Promise<ReferenceEntityResult[]> => {
    if (mode === 'CDC' && cdcError) {
        await Promise.all([
            saveEntityFailure(connection, 'BANK_ACCOUNT', cdcError),
            saveEntityFailure(connection, 'LINE_ITEM_CATEGORY', cdcError),
        ]);
        return [
            toResult('BANK_ACCOUNT', mode, 'FAILED', emptyCounts, null, cdcError),
            toResult('LINE_ITEM_CATEGORY', mode, 'FAILED', emptyCounts, null, cdcError),
        ];
    }

    try {
        const rows =
            mode === 'FULL'
                ? await fetchFullSyncRows(
                      connection,
                      accessToken,
                      'Account',
                      ACCOUNT_FULL_SYNC_QUERY
                  )
                : cdcRows;
        const syncedAt = new Date();
        let counts: AccountApplyResult = {
            bankAccounts: emptyCounts,
            lineItemCategories: emptyCounts,
        };

        await prisma.$transaction(async (tx) => {
            counts = await applyAccountRows(tx, connection, rows, syncedAt);
            await saveEntityState(
                tx,
                connection,
                'BANK_ACCOUNT',
                mode,
                counts.bankAccounts,
                syncedAt,
                mode === 'FULL' ? startedAt : nextWatermark,
                'SUCCESS',
                null
            );
            await saveEntityState(
                tx,
                connection,
                'LINE_ITEM_CATEGORY',
                mode,
                counts.lineItemCategories,
                syncedAt,
                mode === 'FULL' ? startedAt : nextWatermark,
                'SUCCESS',
                null
            );
        });

        return [
            toResult('BANK_ACCOUNT', mode, 'SUCCESS', counts.bankAccounts, syncedAt, null),
            toResult(
                'LINE_ITEM_CATEGORY',
                mode,
                'SUCCESS',
                counts.lineItemCategories,
                syncedAt,
                null
            ),
        ];
    } catch (error) {
        const message = getErrorMessage(error, 'QuickBooks account sync failed');
        await Promise.all([
            saveEntityFailure(connection, 'BANK_ACCOUNT', message),
            saveEntityFailure(connection, 'LINE_ITEM_CATEGORY', message),
        ]);
        return [
            toResult('BANK_ACCOUNT', mode, 'FAILED', emptyCounts, null, message),
            toResult('LINE_ITEM_CATEGORY', mode, 'FAILED', emptyCounts, null, message),
        ];
    }
};

const syncPayees = async ({
    connection,
    accessToken,
    mode,
    cdcRows,
    nextWatermark,
    startedAt,
    cdcError,
}: {
    connection: QuickBooksConnection;
    accessToken: string;
    mode: SyncMode;
    cdcRows: Array<Record<string, unknown>>;
    nextWatermark: Date;
    startedAt: Date;
    cdcError: string | null;
}): Promise<ReferenceEntityResult> => {
    if (mode === 'CDC' && cdcError) {
        await saveEntityFailure(connection, 'PAYEE', cdcError);
        return toResult('PAYEE', mode, 'FAILED', emptyCounts, null, cdcError);
    }

    try {
        const rows =
            mode === 'FULL'
                ? await fetchFullSyncRows(connection, accessToken, 'Vendor', VENDOR_FULL_SYNC_QUERY)
                : cdcRows;
        const syncedAt = new Date();
        let counts = emptyCounts;

        await prisma.$transaction(async (tx) => {
            counts = await applyPayeeRows(tx, connection, rows, syncedAt);
            await saveEntityState(
                tx,
                connection,
                'PAYEE',
                mode,
                counts,
                syncedAt,
                mode === 'FULL' ? startedAt : nextWatermark,
                'SUCCESS',
                null
            );
        });

        return toResult('PAYEE', mode, 'SUCCESS', counts, syncedAt, null);
    } catch (error) {
        const message = getErrorMessage(error, 'QuickBooks vendor sync failed');
        await saveEntityFailure(connection, 'PAYEE', message);
        return toResult('PAYEE', mode, 'FAILED', emptyCounts, null, message);
    }
};

const getOverallStatus = (results: ReferenceEntityResult[]): QuickBooksReferenceSyncStatus => {
    if (results.every((result) => result.status === 'SUCCESS')) return 'SUCCESS';
    if (results.every((result) => result.status === 'FAILED')) return 'FAILED';
    return 'PARTIAL';
};

const isUniqueConstraintError = (error: unknown) =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const acquireReferenceSyncLock = async (
    connection: QuickBooksConnection
): Promise<string | null> => {
    const ownerId = generateNanoId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

    try {
        await prisma.$transaction(async (tx) => {
            await tx.quickBooksReferenceSyncLock.deleteMany({
                where: { realmId: connection.realmId, expiresAt: { lt: now } },
            });
            await tx.quickBooksReferenceSyncLock.create({
                data: {
                    realmId: connection.realmId,
                    connectionId: connection.id,
                    ownerId,
                    lockedAt: now,
                    expiresAt,
                },
            });
        });
        return ownerId;
    } catch (error) {
        if (isUniqueConstraintError(error)) return null;
        throw error;
    }
};

const releaseReferenceSyncLock = async (realmId: string, ownerId: string): Promise<void> => {
    await prisma.quickBooksReferenceSyncLock.deleteMany({ where: { realmId, ownerId } });
};

export const QuickBooksReferenceSyncService = {
    getStatus: async (): Promise<ReferenceSyncOverview> => {
        const connection = await getActiveConnection();
        const latestRun = await prisma.integrationSyncRun.findFirst({
            where: { provider: QUICKBOOKS_REFERENCE_PROVIDER, scope: QUICKBOOKS_REFERENCE_SCOPE },
            orderBy: { startedAt: 'desc' },
        });

        if (!connection) {
            return {
                provider: 'quickbooks',
                connected: false,
                autoDailySyncEnabled: false,
                lastSyncedAt: latestRun?.finishedAt?.toISOString() ?? null,
                lastSyncStatus:
                    (latestRun?.status as QuickBooksReferenceSyncStatus | undefined) ?? null,
                lastSyncError: latestRun?.error ?? null,
                totals: emptyCounts,
                entities: [],
            };
        }

        const states = await prisma.quickBooksReferenceSyncState.findMany({
            where: { realmId: connection.realmId },
            orderBy: { entity: 'asc' },
        });
        const entities: QuickBooksReferenceEntity[] = [
            'BANK_ACCOUNT',
            'LINE_ITEM_CATEGORY',
            'PAYEE',
        ];

        return {
            provider: 'quickbooks',
            connected: true,
            autoDailySyncEnabled: connection.referenceAutoSyncEnabled,
            lastSyncedAt: latestRun?.finishedAt?.toISOString() ?? null,
            lastSyncStatus:
                (latestRun?.status as QuickBooksReferenceSyncStatus | undefined) ?? null,
            lastSyncError: latestRun?.error ?? null,
            totals: {
                totalReceived: latestRun?.totalReceived ?? 0,
                createdCount: latestRun?.createdCount ?? 0,
                updatedCount: latestRun?.updatedCount ?? 0,
                deletedCount: latestRun?.deletedCount ?? 0,
            },
            entities: entities.map((entity) => {
                const state = states.find((entry) => entry.entity === entity);
                return {
                    entity,
                    lastFullSyncedAt: state?.lastFullSyncedAt?.toISOString() ?? null,
                    lastCdcSyncedAt: state?.lastCdcSyncedAt?.toISOString() ?? null,
                    cdcWatermark: state?.cdcWatermark?.toISOString() ?? null,
                    lastSyncStatus: state?.lastSyncStatus ?? null,
                    lastSyncError: state?.lastSyncError ?? null,
                    totalReceived: state?.totalReceived ?? 0,
                    createdCount: state?.createdCount ?? 0,
                    updatedCount: state?.updatedCount ?? 0,
                    deletedCount: state?.deletedCount ?? 0,
                };
            }),
        };
    },

    listBankAccounts: async ({
        includeInactive = false,
    }: {
        includeInactive?: boolean;
    } = {}): Promise<QuickBooksBankAccountOption[]> => {
        const connection = await getActiveConnectionOrThrow();
        const rows = await prisma.quickBooksBankAccount.findMany({
            where: { realmId: connection.realmId, ...activeReferenceWhere(includeInactive) },
            orderBy: [{ fullyQualifiedName: 'asc' }, { name: 'asc' }],
        });

        return rows.map((row) => ({
            id: row.id,
            realmId: row.realmId,
            qbId: row.quickBooksId,
            name: row.name,
            fullyQualifiedName: row.fullyQualifiedName,
            accountSubType: row.accountSubType,
            currencyCode: row.currencyCode,
            active: row.active,
            deletedAt: row.deletedAt?.toISOString() ?? null,
        }));
    },

    listLineItemCategories: async ({
        includeInactive = false,
    }: {
        includeInactive?: boolean;
    } = {}): Promise<QuickBooksLineItemCategoryOption[]> => {
        const connection = await getActiveConnectionOrThrow();
        const rows = await prisma.quickBooksLineItemCategory.findMany({
            where: { realmId: connection.realmId, ...activeReferenceWhere(includeInactive) },
            orderBy: [{ fullyQualifiedName: 'asc' }, { name: 'asc' }],
        });

        return rows.map((row) => ({
            id: row.id,
            realmId: row.realmId,
            qbId: row.quickBooksId,
            name: row.name,
            fullyQualifiedName: row.fullyQualifiedName,
            accountType: row.accountType,
            accountSubType: row.accountSubType,
            currencyCode: row.currencyCode,
            active: row.active,
            deletedAt: row.deletedAt?.toISOString() ?? null,
        }));
    },

    listPayees: async ({
        includeInactive = false,
    }: {
        includeInactive?: boolean;
    } = {}): Promise<QuickBooksPayeeOption[]> => {
        const connection = await getActiveConnectionOrThrow();
        const rows = await prisma.quickBooksPayee.findMany({
            where: { realmId: connection.realmId, ...activeReferenceWhere(includeInactive) },
            orderBy: { displayName: 'asc' },
        });

        return rows.map((row) => ({
            id: row.id,
            realmId: row.realmId,
            qbId: row.quickBooksId,
            displayName: row.displayName,
            companyName: row.companyName,
            primaryEmail: row.primaryEmail,
            primaryPhone: row.primaryPhone,
            active: row.active,
            deletedAt: row.deletedAt?.toISOString() ?? null,
        }));
    },

    setAutoDailySync: async (enabled: boolean) => {
        const connection = await getActiveConnectionOrThrow();

        await prisma.quickBooksConnection.update({
            where: { id: connection.id },
            data: { referenceAutoSyncEnabled: enabled },
        });

        return { autoDailySyncEnabled: enabled };
    },

    syncReferenceData: async ({
        trigger = 'MANUAL',
        userId,
        requireAutoEnabled = false,
    }: {
        trigger?: SyncTrigger;
        userId?: string;
        requireAutoEnabled?: boolean;
    } = {}): Promise<ReferenceSyncResult | null> => {
        const connection = await getActiveConnection();
        if (!connection) {
            if (requireAutoEnabled) return null;
            throw new NotFoundError('QuickBooks is not connected');
        }
        if (requireAutoEnabled && !connection.referenceAutoSyncEnabled) return null;

        const lockOwnerId = await acquireReferenceSyncLock(connection);
        if (!lockOwnerId) {
            if (requireAutoEnabled) return null;
            throw new BadRequestError('QuickBooks reference sync is already running.');
        }

        try {
            const startedAt = new Date();
            const accessToken = await getValidQuickBooksAccessToken(connection);
            const [bankState, categoryState, payeeState] = await Promise.all([
                getState(connection.realmId, 'BANK_ACCOUNT'),
                getState(connection.realmId, 'LINE_ITEM_CATEGORY'),
                getState(connection.realmId, 'PAYEE'),
            ]);
            const accountMode = getGroupMode([bankState, categoryState]);
            const payeeMode = getGroupMode([payeeState]);
            const cdcEntities: QuickBooksEntityName[] = [];
            const cdcStates: ReferenceState[] = [];

            if (accountMode === 'CDC') {
                cdcEntities.push('Account');
                cdcStates.push(bankState, categoryState);
            }
            if (payeeMode === 'CDC') {
                cdcEntities.push('Vendor');
                cdcStates.push(payeeState);
            }

            let cdcResponse: QuickBooksCdcResponse | null = null;
            let cdcError: string | null = null;
            if (cdcEntities.length > 0) {
                try {
                    cdcResponse = await QuickBooksClient.changeDataCapture(
                        connection.realmId,
                        accessToken,
                        cdcEntities,
                        subtractCdcOverlap(getEarliestWatermark(cdcStates))
                    );
                } catch (error) {
                    cdcError = getErrorMessage(error, 'QuickBooks CDC sync failed');
                }
            }

            const nextWatermark = parseCdcResponseTime(cdcResponse, startedAt);
            const accountResults = await syncAccounts({
                connection,
                accessToken,
                mode: accountMode,
                cdcRows: cdcResponse?.rowsByEntity.Account ?? [],
                nextWatermark,
                startedAt,
                cdcError,
            });
            const payeeResult = await syncPayees({
                connection,
                accessToken,
                mode: payeeMode,
                cdcRows: cdcResponse?.rowsByEntity.Vendor ?? [],
                nextWatermark,
                startedAt,
                cdcError,
            });
            const results = [...accountResults, payeeResult];
            const finishedAt = new Date();
            const totals = results.reduce<SyncCounts>(addCounts, emptyCounts);
            const status = getOverallStatus(results);
            const error =
                results
                    .filter((result) => result.error)
                    .map((result) => `${result.entity}: ${result.error}`)
                    .join('\n') || null;

            await prisma.integrationSyncRun.create({
                data: {
                    id: generateNanoId(),
                    provider: QUICKBOOKS_REFERENCE_PROVIDER,
                    scope: QUICKBOOKS_REFERENCE_SCOPE,
                    trigger,
                    status,
                    startedAt,
                    finishedAt,
                    attempted: results.length,
                    succeeded: results.filter((result) => result.status === 'SUCCESS').length,
                    failed: results.filter((result) => result.status === 'FAILED').length,
                    totalReceived: totals.totalReceived,
                    createdCount: totals.createdCount,
                    updatedCount: totals.updatedCount,
                    deletedCount: totals.deletedCount,
                    error,
                    userId,
                },
            });

            await prisma.quickBooksConnection.update({
                where: { id: connection.id },
                data: { lastSyncedAt: finishedAt },
            });

            return {
                provider: 'quickbooks',
                trigger,
                startedAt: startedAt.toISOString(),
                finishedAt: finishedAt.toISOString(),
                status,
                entities: results,
                ...totals,
            };
        } finally {
            await releaseReferenceSyncLock(connection.realmId, lockOwnerId);
        }
    },
};
