import { prisma } from '@lib/prisma';
import { BadRequestError, NotFoundError } from '@utils';

import {
    getQuickBooksClientErrorMessage,
    QuickBooksClient,
    type QuickBooksReportResponse,
} from './quickbooks-client';
import { getValidQuickBooksAccessToken } from './quickbooks-token-helper';

import type { QuickBooksRegisterTransactionsQuery } from './models';
import type { QuickBooksBankAccount, QuickBooksConnection } from '@db/client';

const DEFAULT_RANGE_DAYS = 90;
const MAX_RANGE_DAYS = 366;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type QuickBooksRegisterClr = 'UNCLEARED' | 'CLEARED' | 'RECONCILED';

type QuickBooksRegisterAccount = {
    id: string;
    realmId: string;
    qbId: string;
    name: string;
    fullyQualifiedName: string | null;
    accountType: string | null;
    accountSubType: string | null;
    currencyCode: string | null;
    currentBalance: string | null;
    currentBalanceWithSubAccounts: string | null;
    active: boolean | null;
    lastSyncedAt: string | null;
};

type QuickBooksRegisterTransaction = {
    id: string;
    accountId: string;
    accountQbId: string;
    transactionId: string | null;
    txnDate: string | null;
    transactionType: string | null;
    checkNumber: string | null;
    payee: string | null;
    category: string | null;
    clr: QuickBooksRegisterClr | null;
    amount: string | null;
    debit: string | null;
    credit: string | null;
    balance: string | null;
    memo: string | null;
};

type PaginationMeta = {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalItems: number;
    itemsPerPage: number;
};

type QuickBooksRegisterTransactionsResult = {
    account: QuickBooksRegisterAccount;
    transactions: QuickBooksRegisterTransaction[];
    meta: {
        reportName: 'GeneralLedger';
        generatedAt: string;
        filters: {
            startDate: string;
            endDate: string;
            search: string | null;
            clr: QuickBooksRegisterClr | null;
            transactionType: string | null;
        };
        pagination: PaginationMeta;
        transactionTypes: string[];
        openingBalance: string | null;
        endingBalance: string | null;
    };
};

type ReportCell = {
    value: string | null;
    id: string | null;
};

type ReportColumnKey =
    | 'date'
    | 'transactionType'
    | 'checkNumber'
    | 'payee'
    | 'category'
    | 'clr'
    | 'amount'
    | 'debit'
    | 'credit'
    | 'balance'
    | 'memo'
    | 'unknown';

type ReportColumn = {
    index: number;
    title: string;
    type: string;
    metadataKey: string;
    key: ReportColumnKey;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getRecord = (
    record: Record<string, unknown>,
    key: string
): Record<string, unknown> | null => {
    const value = record[key];
    return isRecord(value) ? value : null;
};

const getString = (record: Record<string, unknown>, key: string): string | null => {
    const value = record[key];
    if (typeof value === 'string') return value.trim() || null;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const parseDateOnly = (value: string | undefined): Date | null => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getDefaultDateRange = () => {
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY);
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
};

const normalizeDateRange = (
    input: Pick<QuickBooksRegisterTransactionsQuery, 'startDate' | 'endDate'>
) => {
    const defaults = getDefaultDateRange();
    const startDate = input.startDate ?? defaults.startDate;
    const endDate = input.endDate ?? defaults.endDate;
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (!start || !end) throw new BadRequestError('Invalid register date range.');
    if (start.getTime() > end.getTime()) {
        throw new BadRequestError('Register start date must be before the end date.');
    }
    if ((end.getTime() - start.getTime()) / MS_PER_DAY > MAX_RANGE_DAYS) {
        throw new BadRequestError(`Register date range cannot exceed ${MAX_RANGE_DAYS} days.`);
    }

    return { startDate, endDate };
};

const decimalToString = (value: { toString(): string } | null | undefined): string | null =>
    value == null ? null : value.toString();

const toRegisterAccount = (row: QuickBooksBankAccount): QuickBooksRegisterAccount => ({
    id: row.id,
    realmId: row.realmId,
    qbId: row.quickBooksId,
    name: row.name,
    fullyQualifiedName: row.fullyQualifiedName,
    accountType: row.accountType,
    accountSubType: row.accountSubType,
    currencyCode: row.currencyCode,
    currentBalance: decimalToString(row.currentBalance),
    currentBalanceWithSubAccounts: decimalToString(row.currentBalanceWithSubAccounts),
    active: row.active,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
});

const getActiveConnection = async (): Promise<QuickBooksConnection | null> =>
    await prisma.quickBooksConnection.findFirst({
        where: { status: 'CONNECTED', disconnectedAt: null },
        orderBy: { updatedAt: 'desc' },
    });

const getActiveConnectionOrThrow = async (): Promise<QuickBooksConnection> => {
    const connection = await getActiveConnection();
    if (!connection) throw new NotFoundError('QuickBooks is not connected');
    return connection;
};

const normalizeHeader = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const getColumnMetadataKey = (column: Record<string, unknown>): string => {
    const metadata = column.MetaData;
    if (!Array.isArray(metadata)) return '';

    for (const entry of metadata) {
        if (!isRecord(entry)) continue;
        if (getString(entry, 'Name')?.toLowerCase() === 'colkey') {
            return getString(entry, 'Value') ?? '';
        }
    }

    return '';
};

const classifyColumn = (column: Record<string, unknown>): ReportColumnKey => {
    const title = normalizeHeader(getString(column, 'ColTitle') ?? '');
    const type = normalizeHeader(getString(column, 'ColType') ?? '');
    const metadataKey = normalizeHeader(getColumnMetadataKey(column));
    const haystack = [title, type, metadataKey].filter(Boolean).join(' ');

    if (/\b(txn date|transaction date|date|tx date)\b/.test(haystack)) return 'date';
    if (/\b(txn type|transaction type|type)\b/.test(haystack)) return 'transactionType';
    if (/\b(doc num|document number|check number|check no|num|no)\b/.test(haystack)) {
        return 'checkNumber';
    }
    if (/\b(payee|name|vendor|customer)\b/.test(haystack)) return 'payee';
    if (/\b(split|category|account)\b/.test(haystack)) return 'category';
    if (/\b(clr|cleared|clear status|reconcile status)\b/.test(haystack)) return 'clr';
    if (/\b(debit)\b/.test(haystack)) return 'debit';
    if (/\b(credit)\b/.test(haystack)) return 'credit';
    if (/\b(balance|running balance)\b/.test(haystack)) return 'balance';
    if (/\b(amount)\b/.test(haystack)) return 'amount';
    if (/\b(memo|description|memo description)\b/.test(haystack)) return 'memo';

    return 'unknown';
};

const getReportColumns = (report: QuickBooksReportResponse): ReportColumn[] => {
    const columns = getRecord(report, 'Columns');
    const rawColumns = columns?.Column;
    if (!Array.isArray(rawColumns)) return [];

    return rawColumns.filter(isRecord).map((column, index) => ({
        index,
        title: getString(column, 'ColTitle') ?? '',
        type: getString(column, 'ColType') ?? '',
        metadataKey: getColumnMetadataKey(column),
        key: classifyColumn(column),
    }));
};

const toReportCell = (value: unknown): ReportCell => {
    if (!isRecord(value)) return { value: null, id: null };
    return {
        value: getString(value, 'value'),
        id: getString(value, 'id'),
    };
};

const getCellData = (row: Record<string, unknown>): ReportCell[] => {
    const colData = row.ColData;
    return Array.isArray(colData) ? colData.map(toReportCell) : [];
};

const getCellValue = (
    columns: ReportColumn[],
    cells: ReportCell[],
    key: ReportColumnKey
): string | null => {
    const column = columns.find((item) => item.key === key);
    if (!column) return null;
    return cells[column.index]?.value ?? null;
};

const findTransactionId = (cells: ReportCell[], accountQbId: string): string | null => {
    for (const cell of cells) {
        if (cell.id && cell.id !== accountQbId) return cell.id;
    }
    return null;
};

const parseMoneyNumber = (value: string | null): number | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-' || trimmed === '--') return null;

    const negative = /^\(.*\)$/.test(trimmed) || /-$/.test(trimmed);
    const normalized = trimmed
        .replace(/[,$()]/g, '')
        .replace(/-$/, '')
        .trim();
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed)) return null;
    return negative ? -Math.abs(parsed) : parsed;
};

const toMoneyString = (value: string | null): string | null => {
    const parsed = parseMoneyNumber(value);
    return parsed == null ? null : parsed.toFixed(2);
};

const getAmountString = (amount: string | null, debit: string | null, credit: string | null) => {
    const parsedAmount = parseMoneyNumber(amount);
    if (parsedAmount != null) return parsedAmount.toFixed(2);

    const parsedDebit = parseMoneyNumber(debit) ?? 0;
    const parsedCredit = parseMoneyNumber(credit) ?? 0;
    if (!parsedDebit && !parsedCredit) return null;

    return (parsedDebit - parsedCredit).toFixed(2);
};

const parseRegisterDateTime = (value: string | null): number => {
    if (!value) return Number.NEGATIVE_INFINITY;

    const trimmed = value.trim();
    const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoDateMatch) {
        return Date.UTC(
            Number(isoDateMatch[1]),
            Number(isoDateMatch[2]) - 1,
            Number(isoDateMatch[3])
        );
    }

    const usDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (usDateMatch) {
        return Date.UTC(Number(usDateMatch[3]), Number(usDateMatch[1]) - 1, Number(usDateMatch[2]));
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const sortTransactionsByDateDesc = (
    transactions: QuickBooksRegisterTransaction[]
): QuickBooksRegisterTransaction[] =>
    [...transactions].sort(
        (left, right) => parseRegisterDateTime(right.txnDate) - parseRegisterDateTime(left.txnDate)
    );
const normalizeClr = (
    value: string | null,
    hasClrColumn: boolean
): QuickBooksRegisterClr | null => {
    if (!hasClrColumn) return null;
    if (!value) return 'UNCLEARED';

    const normalized = value.trim().toLowerCase();
    if (!normalized) return 'UNCLEARED';
    if (normalized === 'r' || normalized.includes('reconciled')) return 'RECONCILED';
    if (normalized === 'c' || normalized.includes('cleared')) return 'CLEARED';
    return 'UNCLEARED';
};

const shouldSkipRow = (cells: ReportCell[]) => {
    const text = cells
        .map((cell) => cell.value ?? '')
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return (
        !text ||
        text.includes('beginning balance') ||
        text.includes('opening balance') ||
        text.includes('ending balance') ||
        text.startsWith('total ')
    );
};

const parseTransactionRow = ({
    row,
    columns,
    account,
    index,
}: {
    row: Record<string, unknown>;
    columns: ReportColumn[];
    account: QuickBooksRegisterAccount;
    index: number;
}): QuickBooksRegisterTransaction | null => {
    const cells = getCellData(row);
    if (!cells.length || shouldSkipRow(cells)) return null;

    const hasClrColumn = columns.some((column) => column.key === 'clr');
    const txnDate = getCellValue(columns, cells, 'date');
    const transactionType = getCellValue(columns, cells, 'transactionType');
    const debit = getCellValue(columns, cells, 'debit');
    const credit = getCellValue(columns, cells, 'credit');
    const amount = getAmountString(getCellValue(columns, cells, 'amount'), debit, credit);
    const transactionId = findTransactionId(cells, account.qbId);

    if (!txnDate && !transactionType && !transactionId && !amount) return null;

    return {
        id: transactionId ?? `${account.id}-${index}`,
        accountId: account.id,
        accountQbId: account.qbId,
        transactionId,
        txnDate,
        transactionType,
        checkNumber: getCellValue(columns, cells, 'checkNumber'),
        payee: getCellValue(columns, cells, 'payee'),
        category: getCellValue(columns, cells, 'category'),
        clr: normalizeClr(getCellValue(columns, cells, 'clr'), hasClrColumn),
        amount,
        debit: toMoneyString(debit),
        credit: toMoneyString(credit),
        balance: toMoneyString(getCellValue(columns, cells, 'balance')),
        memo: getCellValue(columns, cells, 'memo'),
    };
};

const getReportRows = (container: unknown): Record<string, unknown>[] => {
    if (!isRecord(container)) return [];
    const rows = container.Row;
    return Array.isArray(rows) ? rows.filter(isRecord) : [];
};

const collectTransactions = ({
    rows,
    columns,
    account,
    nextIndex,
}: {
    rows: Record<string, unknown>[];
    columns: ReportColumn[];
    account: QuickBooksRegisterAccount;
    nextIndex: { value: number };
}): QuickBooksRegisterTransaction[] => {
    const transactions: QuickBooksRegisterTransaction[] = [];

    for (const row of rows) {
        const nested = getRecord(row, 'Rows');
        if (nested) {
            transactions.push(
                ...collectTransactions({
                    rows: getReportRows(nested),
                    columns,
                    account,
                    nextIndex,
                })
            );
        }

        const transaction = parseTransactionRow({
            row,
            columns,
            account,
            index: nextIndex.value,
        });
        nextIndex.value += 1;

        if (transaction) transactions.push(transaction);
    }

    return transactions;
};

const parseReportTransactions = (
    report: QuickBooksReportResponse,
    account: QuickBooksRegisterAccount
): QuickBooksRegisterTransaction[] => {
    const columns = getReportColumns(report);
    const rows = getReportRows(getRecord(report, 'Rows'));

    if (!columns.length || !rows.length) return [];

    return collectTransactions({ rows, columns, account, nextIndex: { value: 1 } });
};

const matchesSearch = (transaction: QuickBooksRegisterTransaction, search: string | undefined) => {
    const query = search?.trim().toLowerCase();
    if (!query) return true;

    return [
        transaction.payee,
        transaction.category,
        transaction.transactionType,
        transaction.checkNumber,
        transaction.memo,
    ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
};

const getPagination = (page: number, size: number, totalItems: number): PaginationMeta => {
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const currentPage = Math.min(page, totalPages);

    return {
        currentPage,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        totalItems,
        itemsPerPage: size,
    };
};

const getGeneratedAt = (report: QuickBooksReportResponse): string => {
    const header = getRecord(report, 'Header');
    return (header ? getString(header, 'Time') : null) ?? new Date().toISOString();
};

const uniqueSorted = (values: Array<string | null>): string[] =>
    [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
        a.localeCompare(b)
    );

const getEndingBalance = (transactions: QuickBooksRegisterTransaction[]) =>
    sortTransactionsByDateDesc(transactions).find((transaction) => transaction.balance)?.balance ??
    null;

export const QuickBooksRegisterService = {
    listAccounts: async (): Promise<QuickBooksRegisterAccount[]> => {
        const connection = await getActiveConnectionOrThrow();
        const rows = await prisma.quickBooksBankAccount.findMany({
            where: {
                realmId: connection.realmId,
                deletedAt: null,
                OR: [{ active: true }, { active: null }],
            },
            orderBy: [{ fullyQualifiedName: 'asc' }, { name: 'asc' }],
        });

        return rows.map(toRegisterAccount);
    },

    listTransactions: async (
        accountId: string,
        input: QuickBooksRegisterTransactionsQuery
    ): Promise<QuickBooksRegisterTransactionsResult> => {
        const connection = await getActiveConnectionOrThrow();
        const accountRow = await prisma.quickBooksBankAccount.findFirst({
            where: {
                id: accountId,
                realmId: connection.realmId,
                deletedAt: null,
            },
        });

        if (!accountRow) throw new NotFoundError('QuickBooks bank account not found.');
        if (accountRow.active === false) {
            throw new BadRequestError('Selected QuickBooks bank account is inactive.');
        }

        const account = toRegisterAccount(accountRow);
        const { startDate, endDate } = normalizeDateRange(input);
        const accessToken = await getValidQuickBooksAccessToken(connection);
        let report: QuickBooksReportResponse;

        try {
            report = await QuickBooksClient.getReport(
                connection.realmId,
                accessToken,
                'GeneralLedger',
                {
                    start_date: startDate,
                    end_date: endDate,
                    account: account.qbId,
                }
            );
        } catch (error) {
            const message = getQuickBooksClientErrorMessage(error);
            throw new BadRequestError(
                message ? `QuickBooks register failed: ${message}` : 'QuickBooks register failed.'
            );
        }

        const parsedTransactions = parseReportTransactions(report, account);
        const searchedTransactions = parsedTransactions
            .filter((transaction) => matchesSearch(transaction, input.search))
            .filter((transaction) => !input.clr || transaction.clr === input.clr);
        const transactionTypes = uniqueSorted(
            searchedTransactions.map((transaction) => transaction.transactionType)
        );
        const filteredTransactions = searchedTransactions.filter(
            (transaction) =>
                !input.transactionType || transaction.transactionType === input.transactionType
        );
        const orderedTransactions = sortTransactionsByDateDesc(filteredTransactions);
        const pagination = getPagination(input.page, input.size, orderedTransactions.length);
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const transactions = orderedTransactions.slice(
            startIndex,
            startIndex + pagination.itemsPerPage
        );

        return {
            account,
            transactions,
            meta: {
                reportName: 'GeneralLedger',
                generatedAt: getGeneratedAt(report),
                filters: {
                    startDate,
                    endDate,
                    search: input.search?.trim() || null,
                    clr: input.clr ?? null,
                    transactionType: input.transactionType?.trim() || null,
                },
                pagination,
                transactionTypes,
                openingBalance: null,
                endingBalance: getEndingBalance(filteredTransactions),
            },
        };
    },
};
