import { Prisma } from '@db/browser';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log/service';
import { QuickBooksService } from '@modules/integrations/service';
import { BadRequestError, ForbiddenError, NotFoundError } from '@utils/error';
import { generateNanoId } from '@utils/generateNanoId';
import { Decimal } from 'decimal.js';

import {
    formatDateOnlyDisplay,
    formatDateOnlyIso,
    getMonthlyBillCurrentDateOnly,
    formatMonthlyBillPeriodLabel,
    getMonthlyBillDateOnlyBounds,
    getMonthlyBillDateOnlyBoundsIso,
    getMonthlyBillDefaultTxnDate,
    isCurrentMonthlyBillPeriod,
    isDateOnlyInMonthlyBillPeriod,
    parseDateOnlyToUtcDate,
} from './monthly-bills-date';

import type {
    CreateRecurringBillRuleInput,
    PayRecurringBillInput,
    RecurringBillGroup,
    RecurringBillItem,
    RecurringBillMutationContext,
    RecurringBillsQuery,
    RecurringBillsResponse,
    SkipRecurringBillInput,
    SkipRecurringBillMonthInput,
    ToggleRecurringBillRuleInput,
    UpdateRecurringBillRuleInput,
} from './recurring-bills.models';

type DbFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM_MONTHLY';
type ApiFrequency = RecurringBillItem['frequency'];
type DbScheduleTiming =
    | 'START_OF_MONTH'
    | 'DAY_OF_MONTH'
    | 'END_OF_MONTH'
    | 'DAY_OF_WEEK'
    | 'ANCHOR_DATE';
type ApiScheduleTiming = RecurringBillItem['scheduleTiming'];
type DbAmountMode = 'FIXED' | 'VARIABLE';
type ApiAmountMode = RecurringBillItem['amountMode'];
type DbOccurrenceStatus = 'DUE' | 'PAID' | 'SKIPPED' | 'CANCELLED' | 'FAILED';
type ApiOccurrenceStatus = RecurringBillItem['status'];

type DecimalValue = ConstructorParameters<typeof Decimal>[0];

type RecurringRuleRecord = {
    id: string;
    realmId: string;
    name: string;
    qbVendorId: string;
    vendorName: string;
    bankAccountId: string | null;
    bankAccountName: string | null;
    categoryId: string | null;
    categoryName: string | null;
    frequency: DbFrequency;
    interval: number;
    anchorDate: Date;
    scheduleTiming: DbScheduleTiming;
    dayOfMonth: number | null;
    dayOfWeek: number | null;
    amountMode: DbAmountMode;
    defaultAmount: DecimalValue | null;
    descriptionTemplate: string | null;
    memoTemplate: string | null;
    isActive: boolean;
    startsOn: Date | null;
    endsOn: Date | null;
};

type OccurrenceRecord = {
    id: string;
    ruleId: string;
    cycleKey: string;
    dueDate: Date;
    status: DbOccurrenceStatus;
    plannedAmount: DecimalValue | null;
};

type PaymentRecord = {
    id: string;
    ruleId: string;
    occurrenceId: string | null;
    cycleKey: string;
    amount: DecimalValue;
    txnDate: Date;
    transactionId: string;
    transactionUrl: string;
    printLater: boolean;
    invoiceDocumentId: string | null;
};

type ReferenceSnapshot = {
    qbVendorId: string;
    vendorName: string;
    bankAccountId?: string | null;
    bankAccountName?: string | null;
    categoryId?: string | null;
    categoryName?: string | null;
};

const QUICKBOOKS_PURCHASE_EXPENSE_ACCOUNT_TYPES = new Set([
    'Expense',
    'Cost of Goods Sold',
    'Other Expense',
]);

const dbFrequencyByApi = {
    weekly: 'WEEKLY',
    biweekly: 'BIWEEKLY',
    monthly: 'MONTHLY',
    quarterly: 'QUARTERLY',
    yearly: 'YEARLY',
    custom: 'CUSTOM_MONTHLY',
} as const satisfies Record<ApiFrequency, DbFrequency>;

const apiFrequencyByDb = {
    WEEKLY: 'weekly',
    BIWEEKLY: 'biweekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    YEARLY: 'yearly',
    CUSTOM_MONTHLY: 'custom',
} as const satisfies Record<DbFrequency, ApiFrequency>;

const dbTimingByApi = {
    start: 'START_OF_MONTH',
    date: 'DAY_OF_MONTH',
    end: 'END_OF_MONTH',
} as const satisfies Record<ApiScheduleTiming, DbScheduleTiming>;

const apiTimingByDb = {
    START_OF_MONTH: 'start',
    DAY_OF_MONTH: 'date',
    END_OF_MONTH: 'end',
    DAY_OF_WEEK: 'date',
    ANCHOR_DATE: 'date',
} as const satisfies Record<DbScheduleTiming, ApiScheduleTiming>;

const dbAmountModeByApi = {
    fixed: 'FIXED',
    variable: 'VARIABLE',
} as const satisfies Record<ApiAmountMode, DbAmountMode>;

const apiAmountModeByDb = {
    FIXED: 'fixed',
    VARIABLE: 'variable',
} as const satisfies Record<DbAmountMode, ApiAmountMode>;

const apiStatusByDb = {
    DUE: 'due',
    PAID: 'paid',
    SKIPPED: 'skipped',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
} as const satisfies Record<DbOccurrenceStatus, ApiOccurrenceStatus>;

function canManageRecurringBills(role: RecurringBillsQuery['userRole']): boolean {
    return role === 'dev' || role === 'admin' || role === 'accountant' || role === 'ap';
}

function assertCanUpdateRecurringBills(role: RecurringBillsQuery['userRole']) {
    if (!canManageRecurringBills(role)) {
        throw new ForbiddenError('Only admins, accountants, and A/P can manage recurring bills.');
    }
}

function assertCanPayRecurringBills(role: RecurringBillsQuery['userRole']) {
    if (!canManageRecurringBills(role)) {
        throw new ForbiddenError('Only admins, accountants, and A/P can pay recurring bills.');
    }
}

function toDecimal(value: DecimalValue | null | undefined): Decimal {
    return new Decimal(value ?? 0);
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseDateOnly(value: string): Date {
    const date = parseDateOnlyToUtcDate(value);
    if (!date) throw new BadRequestError('Date is invalid.');
    return date;
}

function getQuickBooksAccountType(record: { accountType?: string | null }): string {
    return record.accountType?.trim() ?? '';
}

function isInactiveQuickBooksReference(record: {
    active?: boolean | null;
    deletedAt?: Date | string | null;
}): boolean {
    return record.active === false || record.deletedAt != null;
}

async function getActiveQuickBooksConnection() {
    return prisma.quickBooksConnection.findFirst({
        where: { status: 'CONNECTED', disconnectedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { realmId: true },
    });
}

async function validateQuickBooksReferences(input: {
    realmId: string;
    qbVendorId: string;
    bankAccountId?: string | null;
    categoryId?: string | null;
}): Promise<ReferenceSnapshot> {
    const [vendor, bankAccount, category] = await Promise.all([
        prisma.quickBooksPayee.findUnique({
            where: {
                realmId_quickBooksId: {
                    realmId: input.realmId,
                    quickBooksId: input.qbVendorId,
                },
            },
        }),
        input.bankAccountId
            ? prisma.quickBooksBankAccount.findUnique({
                  where: {
                      realmId_quickBooksId: {
                          realmId: input.realmId,
                          quickBooksId: input.bankAccountId,
                      },
                  },
              })
            : Promise.resolve(null),
        input.categoryId
            ? prisma.quickBooksLineItemCategory.findUnique({
                  where: {
                      realmId_quickBooksId: {
                          realmId: input.realmId,
                          quickBooksId: input.categoryId,
                      },
                  },
              })
            : Promise.resolve(null),
    ]);

    if (!vendor) throw new BadRequestError('Selected QuickBooks vendor was not found.');
    if (isInactiveQuickBooksReference(vendor)) {
        throw new BadRequestError('Selected QuickBooks vendor is inactive or no longer available.');
    }

    if (input.bankAccountId) {
        if (!bankAccount) {
            throw new BadRequestError('Selected QuickBooks bank account was not found.');
        }
        if (isInactiveQuickBooksReference(bankAccount)) {
            throw new BadRequestError(
                'Selected QuickBooks bank account is inactive or no longer available.'
            );
        }
        if (getQuickBooksAccountType(bankAccount) !== 'Bank') {
            throw new BadRequestError('Selected QuickBooks bank account is not a bank account.');
        }
    }

    if (input.categoryId) {
        if (!category) {
            throw new BadRequestError('Selected QuickBooks expense category was not found.');
        }
        if (isInactiveQuickBooksReference(category)) {
            throw new BadRequestError(
                'Selected QuickBooks expense category is inactive or no longer available.'
            );
        }
        if (!QUICKBOOKS_PURCHASE_EXPENSE_ACCOUNT_TYPES.has(getQuickBooksAccountType(category))) {
            throw new BadRequestError(
                'Selected QuickBooks expense category is not valid for purchase payments.'
            );
        }
    }

    return {
        qbVendorId: vendor.quickBooksId,
        vendorName: vendor.displayName,
        bankAccountId: bankAccount?.quickBooksId ?? input.bankAccountId ?? null,
        bankAccountName:
            bankAccount?.fullyQualifiedName ?? bankAccount?.name ?? input.bankAccountId ?? null,
        categoryId: category?.quickBooksId ?? input.categoryId ?? null,
        categoryName: category?.fullyQualifiedName ?? category?.name ?? input.categoryId ?? null,
    };
}

function padTwo(value: number): string {
    return String(value).padStart(2, '0');
}

function toDateOnlyIso(year: number, month: number, day: number): string {
    return `${year}-${padTwo(month)}-${padTwo(day)}`;
}

function getDateParts(date: Date) {
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    };
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function diffDays(left: Date, right: Date): number {
    return Math.floor((left.getTime() - right.getTime()) / 86_400_000);
}

function isBeforeDateOnly(left: Date, right: Date): boolean {
    return formatDateOnlyIso(left) < formatDateOnlyIso(right);
}

function isAfterDateOnly(left: Date, right: Date): boolean {
    return formatDateOnlyIso(left) > formatDateOnlyIso(right);
}

function isDateWithinRuleRange(date: Date, rule: RecurringRuleRecord): boolean {
    if (rule.startsOn && isBeforeDateOnly(date, rule.startsOn)) return false;
    if (rule.endsOn && isAfterDateOnly(date, rule.endsOn)) return false;
    return true;
}

function getMonthlyDueDate(rule: RecurringRuleRecord, year: number, month: number): Date {
    const daysInMonth = getDaysInMonth(year, month);
    const day =
        rule.scheduleTiming === 'START_OF_MONTH'
            ? 1
            : rule.scheduleTiming === 'END_OF_MONTH'
              ? daysInMonth
              : Math.max(1, Math.min(rule.dayOfMonth ?? 1, daysInMonth));

    return parseDateOnly(toDateOnlyIso(year, month, day));
}

function shouldRenderMonthlyInterval(rule: RecurringRuleRecord, year: number, month: number) {
    const anchor = getDateParts(rule.anchorDate);
    const diff = (year - anchor.year) * 12 + (month - anchor.month);
    const interval = Math.max(1, rule.interval || 1);

    return diff >= 0 && diff % interval === 0;
}

export function getRecurringBillDueDatesForPeriod(
    rule: RecurringRuleRecord,
    year: number,
    month: number
): Date[] {
    const { startDate, endDate } = getMonthlyBillDateOnlyBounds(year, month);
    const dates: Date[] = [];

    if (rule.frequency === 'WEEKLY') {
        const targetDay = (rule.dayOfWeek ?? 1) % 7;
        const daysInMonth = getDaysInMonth(year, month);

        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = parseDateOnly(toDateOnlyIso(year, month, day));
            if (date.getUTCDay() === targetDay && isDateWithinRuleRange(date, rule)) {
                dates.push(date);
            }
        }
        return dates;
    }

    if (rule.frequency === 'BIWEEKLY') {
        let cursor = rule.anchorDate;
        while (isBeforeDateOnly(cursor, startDate)) cursor = addDays(cursor, 14);

        while (!isAfterDateOnly(cursor, endDate)) {
            if (isDateWithinRuleRange(cursor, rule)) dates.push(cursor);
            cursor = addDays(cursor, 14);
        }
        return dates;
    }

    if (rule.frequency === 'MONTHLY') {
        const date = getMonthlyDueDate(rule, year, month);
        return isDateWithinRuleRange(date, rule) ? [date] : [];
    }

    if (rule.frequency === 'CUSTOM_MONTHLY') {
        if (!shouldRenderMonthlyInterval(rule, year, month)) return [];
        const date = getMonthlyDueDate(rule, year, month);
        return isDateWithinRuleRange(date, rule) ? [date] : [];
    }

    if (rule.frequency === 'QUARTERLY') {
        if (!shouldRenderMonthlyInterval({ ...rule, interval: 3 }, year, month)) return [];
        const date = getMonthlyDueDate(rule, year, month);
        return isDateWithinRuleRange(date, rule) ? [date] : [];
    }

    if (rule.frequency === 'YEARLY') {
        if (!shouldRenderMonthlyInterval({ ...rule, interval: 12 }, year, month)) return [];
        const date = getMonthlyDueDate(rule, year, month);
        return isDateWithinRuleRange(date, rule) ? [date] : [];
    }

    return [];
}

function toPagination(query: Pick<RecurringBillsQuery, 'page' | 'size'>, totalItems: number) {
    const totalPages = Math.max(1, Math.ceil(totalItems / query.size));

    return {
        currentPage: query.page,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
        totalItems,
        itemsPerPage: query.size,
    };
}

function getDueDay(rule: RecurringRuleRecord) {
    if (rule.frequency === 'WEEKLY' || rule.frequency === 'BIWEEKLY') {
        return rule.dayOfWeek ?? 1;
    }
    if (rule.scheduleTiming === 'START_OF_MONTH') return 1;
    if (rule.scheduleTiming === 'END_OF_MONTH') return 28;
    return rule.dayOfMonth ?? 1;
}

function toRecurringBillItem(params: {
    rule: RecurringRuleRecord;
    dueDate: Date;
    occurrence?: OccurrenceRecord;
    payment?: PaymentRecord;
}): RecurringBillItem {
    const { rule, dueDate, occurrence, payment } = params;
    const cycleKey = formatDateOnlyIso(dueDate);
    const status = payment ? 'paid' : occurrence ? apiStatusByDb[occurrence.status] : 'due';

    return {
        id: occurrence?.id ?? `${rule.id}:${cycleKey}`,
        ruleId: rule.id,
        name: rule.name,
        vendorId: rule.qbVendorId,
        vendorName: rule.vendorName,
        categoryId: rule.categoryId,
        categoryName: rule.categoryName,
        bankAccountId: rule.bankAccountId,
        bankAccountName: rule.bankAccountName,
        frequency: apiFrequencyByDb[rule.frequency],
        scheduleTiming: apiTimingByDb[rule.scheduleTiming],
        weeklyDay: rule.dayOfWeek,
        customIntervalMonths: rule.frequency === 'CUSTOM_MONTHLY' ? rule.interval : null,
        amountMode: apiAmountModeByDb[rule.amountMode],
        defaultAmount: toDecimal(rule.defaultAmount).toNumber(),
        dueDay: getDueDay(rule),
        startsOn: rule.startsOn ? formatDateOnlyIso(rule.startsOn) : null,
        endsOn: rule.endsOn ? formatDateOnlyIso(rule.endsOn) : null,
        dueDate: cycleKey,
        cycleKey,
        status,
        isActive: rule.isActive,
        payment: payment
            ? {
                  id: payment.id,
                  amount: toDecimal(payment.amount).toNumber(),
                  txnDate: formatDateOnlyIso(payment.txnDate),
                  transactionId: payment.transactionId,
                  transactionUrl: payment.transactionUrl,
                  printLater: payment.printLater,
                  invoiceDocumentId: payment.invoiceDocumentId,
              }
            : null,
    };
}

function toRecurringBillGroup(
    rule: RecurringRuleRecord,
    occurrences: RecurringBillItem[]
): RecurringBillGroup {
    const paidItems = occurrences.filter((item) => item.status === 'paid');
    const skippedItems = occurrences.filter((item) => item.status === 'skipped');
    const dueItems = occurrences.filter((item) => item.status === 'due');
    const scheduledItems = occurrences.filter((item) => item.status !== 'skipped');

    return {
        ruleId: rule.id,
        name: rule.name,
        vendorId: rule.qbVendorId,
        vendorName: rule.vendorName,
        categoryId: rule.categoryId,
        categoryName: rule.categoryName,
        bankAccountId: rule.bankAccountId,
        bankAccountName: rule.bankAccountName,
        frequency: apiFrequencyByDb[rule.frequency],
        scheduleTiming: apiTimingByDb[rule.scheduleTiming],
        weeklyDay: rule.dayOfWeek,
        customIntervalMonths: rule.frequency === 'CUSTOM_MONTHLY' ? rule.interval : null,
        amountMode: apiAmountModeByDb[rule.amountMode],
        defaultAmount: toDecimal(rule.defaultAmount).toNumber(),
        dueDay: getDueDay(rule),
        startsOn: rule.startsOn ? formatDateOnlyIso(rule.startsOn) : null,
        endsOn: rule.endsOn ? formatDateOnlyIso(rule.endsOn) : null,
        isActive: rule.isActive,
        occurrences,
        summary: {
            occurrenceCount: occurrences.length,
            dueCount: dueItems.length,
            paidCount: paidItems.length,
            skippedCount: skippedItems.length,
            plannedAmount: scheduledItems.reduce((sum, item) => sum + item.defaultAmount, 0),
            paidAmount: paidItems.reduce((sum, item) => sum + (item.payment?.amount ?? 0), 0),
            isCompleteForPeriod:
                occurrences.length > 0 &&
                dueItems.length === 0 &&
                occurrences.length === paidItems.length + skippedItems.length,
        },
    };
}
function summarizeItems(
    rules: RecurringRuleRecord[],
    items: RecurringBillItem[]
): RecurringBillsResponse['meta']['summary'] {
    const activeCount = rules.filter((rule) => rule.isActive).length;
    const pausedCount = rules.length - activeCount;
    const scheduledItems = items.filter((item) => item.isActive && item.status !== 'skipped');
    const paidItems = items.filter((item) => item.payment);

    return {
        activeCount,
        pausedCount,
        scheduledCount: scheduledItems.length,
        plannedAmount: scheduledItems.reduce((sum, item) => sum + item.defaultAmount, 0),
        paidAmount: paidItems.reduce((sum, item) => sum + (item.payment?.amount ?? 0), 0),
        paidCount: paidItems.length,
    };
}

function assertPaymentDateInPeriod(txnDate: Date, dueDate: Date) {
    const { year, month } = getDateParts(dueDate);
    if (isDateOnlyInMonthlyBillPeriod(txnDate, month, year)) return;

    throw new BadRequestError('Payment date must be within the selected recurring bill period.');
}

function assertCurrentPeriodForPayment(dueDate: Date) {
    const { year, month } = getDateParts(dueDate);
    if (isCurrentMonthlyBillPeriod(month, year)) return;

    throw new BadRequestError('Recurring bills can only be paid for the current month.');
}

function assertGeneratedOccurrence(rule: RecurringRuleRecord, dueDate: Date) {
    const { year, month } = getDateParts(dueDate);
    const dueDates = getRecurringBillDueDatesForPeriod(rule, year, month);
    const dueDateIso = formatDateOnlyIso(dueDate);
    if (dueDates.some((date) => formatDateOnlyIso(date) === dueDateIso)) return;

    throw new BadRequestError('This recurring bill is not scheduled for the selected date.');
}

function getCreateRuleData(
    input: CreateRecurringBillRuleInput,
    realmId: string,
    snapshot: ReferenceSnapshot
): Prisma.RecurringBillRuleUncheckedCreateInput {
    const effectiveStartDate =
        input.startsOn || input.anchorDate || getMonthlyBillCurrentDateOnly();
    const anchorDate = parseDateOnly(effectiveStartDate);
    const frequency: DbFrequency = dbFrequencyByApi[input.frequency];
    const scheduleTiming: DbScheduleTiming =
        input.frequency === 'weekly' || input.frequency === 'biweekly'
            ? 'DAY_OF_WEEK'
            : dbTimingByApi[input.scheduleTiming];
    const amountMode: DbAmountMode = dbAmountModeByApi[input.amountMode];

    return {
        id: generateNanoId(),
        realmId,
        name: input.name.trim(),
        qbVendorId: snapshot.qbVendorId,
        vendorName: snapshot.vendorName,
        bankAccountId: snapshot.bankAccountId || null,
        bankAccountName: snapshot.bankAccountName || input.bankAccountName || null,
        categoryId: snapshot.categoryId || null,
        categoryName: snapshot.categoryName || input.categoryName || null,
        frequency,
        interval:
            input.frequency === 'custom'
                ? input.customIntervalMonths!
                : input.frequency === 'biweekly'
                  ? 2
                  : 1,
        anchorDate,
        scheduleTiming,
        dayOfMonth:
            input.frequency === 'weekly' || input.frequency === 'biweekly'
                ? null
                : input.scheduleTiming === 'date'
                  ? input.dueDay
                  : null,
        dayOfWeek:
            input.frequency === 'weekly' || input.frequency === 'biweekly' ? input.weeklyDay : null,
        amountMode,
        defaultAmount: new Decimal(input.defaultAmount),
        descriptionTemplate: input.descriptionTemplate?.trim() || null,
        memoTemplate: input.memoTemplate?.trim() || null,
        startsOn: parseDateOnly(effectiveStartDate),
        endsOn: input.endsOn ? parseDateOnly(input.endsOn) : null,
        createdById: input.userId,
        updatedById: input.userId,
    };
}

export const RecurringBillsService = {
    async listRecurringBills(query: RecurringBillsQuery): Promise<RecurringBillsResponse> {
        if (!canManageRecurringBills(query.userRole)) {
            throw new ForbiddenError('You are not allowed to access recurring bills.');
        }

        const activeQuickBooksConnection = await getActiveQuickBooksConnection();
        const { startDate, endDate } = getMonthlyBillDateOnlyBounds(query.year, query.month);
        const where: Prisma.RecurringBillRuleWhereInput = {
            deletedAt: null,
            ...(activeQuickBooksConnection && { realmId: activeQuickBooksConnection.realmId }),
        };

        if (query.vendorId?.length) {
            where.qbVendorId = { in: query.vendorId };
        }

        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { vendorName: { contains: query.search, mode: 'insensitive' } },
                { categoryName: { contains: query.search, mode: 'insensitive' } },
                { bankAccountName: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        const rules = (await prisma.recurringBillRule.findMany({
            where,
            orderBy: [{ vendorName: 'asc' }, { name: 'asc' }],
        })) as RecurringRuleRecord[];

        const ruleIds = rules.map((rule) => rule.id);
        const computedDueDates = new Map<string, Date[]>();
        const computedCycleKeys = new Set<string>();

        for (const rule of rules) {
            const dates = getRecurringBillDueDatesForPeriod(rule, query.year, query.month);
            computedDueDates.set(rule.id, dates);
            for (const date of dates) computedCycleKeys.add(formatDateOnlyIso(date));
        }

        const [occurrences, payments] =
            ruleIds.length > 0
                ? await Promise.all([
                      prisma.recurringBillOccurrence.findMany({
                          where: {
                              ruleId: { in: ruleIds },
                              dueDate: { gte: startDate, lte: endDate },
                          },
                      }) as Promise<OccurrenceRecord[]>,
                      computedCycleKeys.size > 0
                          ? (prisma.recurringBillPayment.findMany({
                                where: {
                                    ruleId: { in: ruleIds },
                                    cycleKey: { in: Array.from(computedCycleKeys) },
                                },
                            }) as Promise<PaymentRecord[]>)
                          : Promise.resolve([]),
                  ])
                : [[], []];

        const occurrenceByKey = new Map(
            occurrences.map((occurrence) => [
                `${occurrence.ruleId}:${occurrence.cycleKey}`,
                occurrence,
            ])
        );
        const paymentByKey = new Map(
            payments.map((payment) => [`${payment.ruleId}:${payment.cycleKey}`, payment])
        );

        const allGroups = rules.map((rule) => {
            const items = (computedDueDates.get(rule.id) ?? []).map((dueDate) => {
                const cycleKey = formatDateOnlyIso(dueDate);
                const key = `${rule.id}:${cycleKey}`;
                return toRecurringBillItem({
                    rule,
                    dueDate,
                    occurrence: occurrenceByKey.get(key),
                    payment: paymentByKey.get(key),
                });
            });

            return toRecurringBillGroup(rule, items);
        });

        const statusFilter = new Set((query.status ?? []) as ApiOccurrenceStatus[]);
        const filteredGroups =
            statusFilter.size > 0
                ? allGroups
                      .map((group) => ({
                          ...group,
                          occurrences: group.occurrences.filter((item) =>
                              statusFilter.has(item.status)
                          ),
                      }))
                      .filter((group) => group.occurrences.length > 0)
                      .map((group) =>
                          toRecurringBillGroup(
                              rules.find((rule) => rule.id === group.ruleId)!,
                              group.occurrences
                          )
                      )
                : allGroups;

        const pagination = toPagination(query, filteredGroups.length);
        const pageStart = (query.page - 1) * query.size;
        const pageGroups = filteredGroups.slice(pageStart, pageStart + query.size);
        const pageItems = pageGroups.flatMap((group) => group.occurrences);
        const allItems = allGroups.flatMap((group) => group.occurrences);
        const dateOnlyBounds = getMonthlyBillDateOnlyBoundsIso(query.year, query.month);

        return {
            items: pageItems,
            groups: pageGroups,
            meta: {
                period: {
                    month: query.month,
                    year: query.year,
                    label: formatMonthlyBillPeriodLabel(query.year, query.month),
                    isCurrent: isCurrentMonthlyBillPeriod(query.month, query.year),
                    ...dateOnlyBounds,
                    defaultTxnDate: getMonthlyBillDefaultTxnDate(query.year, query.month),
                },
                capabilities: {
                    canUpdateBills:
                        query.canUpdateMonthlyBills && canManageRecurringBills(query.userRole),
                    canMarkPayment:
                        query.canMarkMonthlyBills && canManageRecurringBills(query.userRole),
                },
                summary: summarizeItems(rules, allItems),
                pagination,
            },
        };
    },

    async createRecurringBillRule(input: CreateRecurringBillRuleInput) {
        assertCanUpdateRecurringBills(input.userRole);
        const connection = await getActiveQuickBooksConnection();
        if (!connection) throw new NotFoundError('QuickBooks is not connected.');

        const snapshot = await validateQuickBooksReferences({
            realmId: connection.realmId,
            qbVendorId: input.vendorId,
            bankAccountId: input.bankAccountId || null,
            categoryId: input.categoryId || null,
        });
        const rule = await prisma.recurringBillRule.create({
            data: getCreateRuleData(input, connection.realmId, snapshot),
        });

        await ActivityLogService.log({
            userId: input.userId,
            entityType: 'recurringBill',
            entityId: rule.id,
            action: 'create',
            description: `Created recurring bill ${rule.name}`,
        });

        return rule;
    },

    async updateRecurringBillRule(input: UpdateRecurringBillRuleInput) {
        assertCanUpdateRecurringBills(input.userRole);
        const current = (await prisma.recurringBillRule.findFirst({
            where: { id: input.ruleId, deletedAt: null },
        })) as RecurringRuleRecord | null;

        if (!current) throw new NotFoundError('Recurring bill not found.');

        let snapshot: ReferenceSnapshot | null = null;
        if (input.vendorId || input.bankAccountId || input.categoryId) {
            snapshot = await validateQuickBooksReferences({
                realmId: current.realmId,
                qbVendorId: input.vendorId || current.qbVendorId,
                bankAccountId:
                    input.bankAccountId === undefined
                        ? current.bankAccountId
                        : input.bankAccountId || null,
                categoryId:
                    input.categoryId === undefined ? current.categoryId : input.categoryId || null,
            });
        }

        const data: Prisma.RecurringBillRuleUpdateInput = {
            updatedById: input.userId,
        };

        if (input.name !== undefined) data.name = input.name.trim();
        if (input.isActive !== undefined) data.isActive = input.isActive;
        if (input.vendorId !== undefined && snapshot) {
            data.qbVendorId = snapshot.qbVendorId;
            data.vendorName = snapshot.vendorName;
        }
        if (input.bankAccountId !== undefined) {
            data.bankAccountId = snapshot?.bankAccountId || null;
            data.bankAccountName = snapshot?.bankAccountName || input.bankAccountName || null;
        }
        if (input.categoryId !== undefined) {
            data.categoryId = snapshot?.categoryId || null;
            data.categoryName = snapshot?.categoryName || input.categoryName || null;
        }
        if (
            input.frequency !== undefined ||
            input.scheduleTiming !== undefined ||
            input.weeklyDay !== undefined ||
            input.dueDay !== undefined ||
            input.customIntervalMonths !== undefined
        ) {
            const nextFrequency = input.frequency ?? apiFrequencyByDb[current.frequency];
            const nextScheduleTiming =
                input.scheduleTiming ?? apiTimingByDb[current.scheduleTiming];
            const usesWeekday = nextFrequency === 'weekly' || nextFrequency === 'biweekly';

            data.frequency = dbFrequencyByApi[nextFrequency];
            data.scheduleTiming = usesWeekday ? 'DAY_OF_WEEK' : dbTimingByApi[nextScheduleTiming];
            data.dayOfWeek = usesWeekday ? (input.weeklyDay ?? current.dayOfWeek ?? 1) : null;
            data.dayOfMonth =
                usesWeekday || nextScheduleTiming !== 'date'
                    ? null
                    : (input.dueDay ?? current.dayOfMonth ?? 1);
            data.interval =
                nextFrequency === 'custom'
                    ? (input.customIntervalMonths ?? current.interval)
                    : nextFrequency === 'biweekly'
                      ? 2
                      : 1;
        }
        if (input.amountMode !== undefined) data.amountMode = dbAmountModeByApi[input.amountMode];
        if (input.defaultAmount !== undefined)
            data.defaultAmount = new Decimal(input.defaultAmount);
        if (input.descriptionTemplate !== undefined) {
            data.descriptionTemplate = input.descriptionTemplate?.trim() || null;
        }
        if (input.memoTemplate !== undefined)
            data.memoTemplate = input.memoTemplate?.trim() || null;
        if (input.anchorDate !== undefined) data.anchorDate = parseDateOnly(input.anchorDate);
        if (input.startsOn !== undefined)
            data.startsOn = input.startsOn ? parseDateOnly(input.startsOn) : null;
        if (input.endsOn !== undefined)
            data.endsOn = input.endsOn ? parseDateOnly(input.endsOn) : null;

        const nextAmountMode = input.amountMode ?? apiAmountModeByDb[current.amountMode];
        const nextDefaultAmount =
            input.defaultAmount !== undefined
                ? new Decimal(input.defaultAmount)
                : toDecimal(current.defaultAmount);
        if (nextAmountMode === 'fixed' && !nextDefaultAmount.gt(0)) {
            throw new BadRequestError(
                'Fixed recurring bills must have an amount greater than zero.'
            );
        }

        const rule = await prisma.recurringBillRule.update({
            where: { id: input.ruleId },
            data,
        });

        await ActivityLogService.log({
            userId: input.userId,
            entityType: 'recurringBill',
            entityId: rule.id,
            action: 'update',
            description: `Updated recurring bill ${rule.name}`,
        });

        return rule;
    },

    async toggleRecurringBillRule(input: ToggleRecurringBillRuleInput) {
        return RecurringBillsService.updateRecurringBillRule({
            ruleId: input.ruleId,
            isActive: input.isActive,
            userId: input.userId,
            userRole: input.userRole,
        });
    },

    async deleteRecurringBillRule(input: RecurringBillMutationContext & { ruleId: string }) {
        assertCanUpdateRecurringBills(input.userRole);
        const rule = await prisma.recurringBillRule.findFirst({
            where: { id: input.ruleId, deletedAt: null },
        });
        if (!rule) throw new NotFoundError('Recurring bill not found.');

        const deleted = await prisma.recurringBillRule.update({
            where: { id: input.ruleId },
            data: { deletedAt: new Date(), updatedById: input.userId, isActive: false },
        });

        await ActivityLogService.log({
            userId: input.userId,
            entityType: 'recurringBill',
            entityId: deleted.id,
            action: 'delete',
            description: `Deleted recurring bill ${deleted.name}`,
        });

        return deleted;
    },

    async payRecurringBill(input: PayRecurringBillInput) {
        assertCanPayRecurringBills(input.userRole);
        const rule = (await prisma.recurringBillRule.findFirst({
            where: { id: input.ruleId, deletedAt: null },
        })) as RecurringRuleRecord | null;

        if (!rule) throw new NotFoundError('Recurring bill not found.');
        if (!rule.isActive) throw new BadRequestError('Recurring bill is paused.');
        if (input.qbVendorId !== rule.qbVendorId) {
            throw new BadRequestError(
                'Recurring bill vendor does not match the selected payment vendor.'
            );
        }
        if (input.cycleKey !== input.dueDate) {
            throw new BadRequestError('Recurring bill cycle does not match the due date.');
        }

        const dueDate = parseDateOnly(input.dueDate);
        const txnDate = parseDateOnly(input.txnDate);
        assertGeneratedOccurrence(rule, dueDate);
        assertCurrentPeriodForPayment(dueDate);
        assertPaymentDateInPeriod(txnDate, dueDate);

        if (input.invoiceDocumentId) {
            const document = await prisma.file.findFirst({
                where: { id: input.invoiceDocumentId, type: 'FILE', deletedAt: null },
                select: { id: true },
            });
            if (!document) throw new BadRequestError('Invoice document was not found.');
        }

        const existingPayment = await prisma.recurringBillPayment.findUnique({
            where: {
                ruleId_cycleKey: {
                    ruleId: rule.id,
                    cycleKey: input.cycleKey,
                },
            },
        });
        if (existingPayment) throw new BadRequestError('This recurring bill is already paid.');

        const { transactionId, transactionUrl, quickBooksResponse } =
            await QuickBooksService.createVendorPurchase({
                qbVendorId: input.qbVendorId,
                bankAccountId: input.bankAccountId,
                categoryId: input.categoryId,
                amount: input.amount,
                txnDate: input.txnDate,
                lineDescription: input.description,
                memo: input.memo || undefined,
                printLater: input.printLater,
            });

        const payment = await prisma.$transaction(async (tx) => {
            const occurrence = await tx.recurringBillOccurrence.upsert({
                where: {
                    ruleId_cycleKey: {
                        ruleId: rule.id,
                        cycleKey: input.cycleKey,
                    },
                },
                update: {
                    status: 'PAID',
                    plannedAmount: new Decimal(input.amount),
                },
                create: {
                    id: generateNanoId(),
                    ruleId: rule.id,
                    cycleKey: input.cycleKey,
                    dueDate,
                    status: 'PAID',
                    plannedAmount: new Decimal(input.amount),
                },
            });

            return tx.recurringBillPayment.create({
                data: {
                    id: generateNanoId(),
                    ruleId: rule.id,
                    occurrenceId: occurrence.id,
                    cycleKey: input.cycleKey,
                    amount: new Decimal(input.amount),
                    txnDate,
                    qbVendorId: input.qbVendorId,
                    bankAccountId: input.bankAccountId,
                    categoryId: input.categoryId,
                    transactionId,
                    transactionUrl,
                    quickBooksResponse: toJsonValue(quickBooksResponse),
                    printLater: input.printLater,
                    description: input.description,
                    memo: input.memo || null,
                    invoiceDocumentId: input.invoiceDocumentId || null,
                    createdById: input.userId,
                },
            });
        });

        await ActivityLogService.log({
            userId: input.userId,
            entityType: 'recurringBill',
            entityId: rule.id,
            action: 'update',
            description: `Paid recurring bill ${rule.name} for ${formatDateOnlyDisplay(dueDate)}`,
            affectedEntityIds: input.invoiceDocumentId ? [input.invoiceDocumentId] : [],
        });

        return payment;
    },

    async skipRecurringBill(input: SkipRecurringBillInput) {
        assertCanUpdateRecurringBills(input.userRole);
        const rule = (await prisma.recurringBillRule.findFirst({
            where: { id: input.ruleId, deletedAt: null },
        })) as RecurringRuleRecord | null;

        if (!rule) throw new NotFoundError('Recurring bill not found.');
        if (input.cycleKey !== input.dueDate) {
            throw new BadRequestError('Recurring bill cycle does not match the due date.');
        }
        const dueDate = parseDateOnly(input.dueDate);
        assertGeneratedOccurrence(rule, dueDate);

        const existingPayment = await prisma.recurringBillPayment.findUnique({
            where: {
                ruleId_cycleKey: {
                    ruleId: rule.id,
                    cycleKey: input.cycleKey,
                },
            },
            select: { id: true },
        });
        if (existingPayment) throw new BadRequestError('Paid recurring bills cannot be skipped.');

        const occurrence = await prisma.recurringBillOccurrence.upsert({
            where: {
                ruleId_cycleKey: {
                    ruleId: rule.id,
                    cycleKey: input.cycleKey,
                },
            },
            update: {
                status: 'SKIPPED',
                skippedAt: new Date(),
                skippedById: input.userId,
                skipReason: input.reason || null,
            },
            create: {
                id: generateNanoId(),
                ruleId: rule.id,
                cycleKey: input.cycleKey,
                dueDate,
                status: 'SKIPPED',
                skippedAt: new Date(),
                skippedById: input.userId,
                skipReason: input.reason || null,
                plannedAmount: toDecimal(rule.defaultAmount),
            },
        });

        await ActivityLogService.log({
            userId: input.userId,
            entityType: 'recurringBill',
            entityId: rule.id,
            action: 'update',
            description: `Skipped recurring bill ${rule.name} for ${formatDateOnlyDisplay(dueDate)}`,
        });

        return occurrence;
    },

    async skipRecurringBillMonth(input: SkipRecurringBillMonthInput) {
        assertCanUpdateRecurringBills(input.userRole);
        const rule = (await prisma.recurringBillRule.findFirst({
            where: { id: input.ruleId, deletedAt: null },
        })) as RecurringRuleRecord | null;

        if (!rule) throw new NotFoundError('Recurring bill not found.');

        const dueDates = getRecurringBillDueDatesForPeriod(rule, input.year, input.month);
        if (dueDates.length === 0) {
            throw new BadRequestError(
                'This recurring bill has no scheduled payments in this period.'
            );
        }

        const cycleKeys = dueDates.map(formatDateOnlyIso);
        const paidPayments = await prisma.recurringBillPayment.findMany({
            where: {
                ruleId: rule.id,
                cycleKey: { in: cycleKeys },
            },
            select: { cycleKey: true },
        });
        const paidCycleKeys = new Set(paidPayments.map((payment) => payment.cycleKey));
        const unpaidDueDates = dueDates.filter(
            (date) => !paidCycleKeys.has(formatDateOnlyIso(date))
        );

        if (unpaidDueDates.length === 0) {
            throw new BadRequestError('All recurring bills in this period are already paid.');
        }

        const skippedAt = new Date();
        const occurrences = await prisma.$transaction(
            unpaidDueDates.map((dueDate) => {
                const cycleKey = formatDateOnlyIso(dueDate);
                return prisma.recurringBillOccurrence.upsert({
                    where: {
                        ruleId_cycleKey: {
                            ruleId: rule.id,
                            cycleKey,
                        },
                    },
                    update: {
                        status: 'SKIPPED',
                        skippedAt,
                        skippedById: input.userId,
                        skipReason: input.reason || null,
                    },
                    create: {
                        id: generateNanoId(),
                        ruleId: rule.id,
                        cycleKey,
                        dueDate,
                        status: 'SKIPPED',
                        skippedAt,
                        skippedById: input.userId,
                        skipReason: input.reason || null,
                        plannedAmount: toDecimal(rule.defaultAmount),
                    },
                });
            })
        );

        await ActivityLogService.log({
            userId: input.userId,
            entityType: 'recurringBill',
            entityId: rule.id,
            action: 'update',
            description: `Skipped recurring bill ${rule.name} for ${formatMonthlyBillPeriodLabel(input.year, input.month)}`,
        });

        return { skippedCount: occurrences.length };
    },
};
