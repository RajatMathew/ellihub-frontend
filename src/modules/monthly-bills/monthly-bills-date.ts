import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export const MONTHLY_BILL_TIME_ZONE = 'America/New_York';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function padTwo(value: number): string {
    return String(value).padStart(2, '0');
}

function getNextMonth(year: number, month: number) {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function getMonthlyBillCurrentPeriod(now = new Date()) {
    const zonedNow = toZonedTime(now, MONTHLY_BILL_TIME_ZONE);
    return { month: zonedNow.getMonth() + 1, year: zonedNow.getFullYear() };
}

export function getMonthlyBillCurrentDateOnly(now = new Date()) {
    const zonedNow = toZonedTime(now, MONTHLY_BILL_TIME_ZONE);
    return `${zonedNow.getFullYear()}-${padTwo(zonedNow.getMonth() + 1)}-${padTwo(
        zonedNow.getDate()
    )}`;
}

export function isCurrentMonthlyBillPeriod(month: number, year: number, now = new Date()) {
    const current = getMonthlyBillCurrentPeriod(now);
    return month === current.month && year === current.year;
}

export function getMonthlyBillInstantBounds(year: number, month: number) {
    const startOfPeriod = fromZonedTime(
        `${year}-${padTwo(month)}-01T00:00:00.000`,
        MONTHLY_BILL_TIME_ZONE
    );
    const next = getNextMonth(year, month);
    const nextPeriodStart = fromZonedTime(
        `${next.year}-${padTwo(next.month)}-01T00:00:00.000`,
        MONTHLY_BILL_TIME_ZONE
    );

    return { startOfPeriod, nextPeriodStart };
}

export function parseDateOnlyToUtcDate(value: string): Date | null {
    const match = DATE_ONLY_PATTERN.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date;
}

export function formatDateOnlyIso(date: Date): string {
    return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(
        date.getUTCDate()
    )}`;
}

export function formatDateOnlyDisplay(date: Date): string {
    return `${padTwo(date.getUTCMonth() + 1)}/${padTwo(date.getUTCDate())}/${date.getUTCFullYear()}`;
}

export function getMonthlyBillDateOnlyBounds(year: number, month: number) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    return { startDate, endDate };
}

export function getMonthlyBillDateOnlyBoundsIso(year: number, month: number) {
    const { startDate, endDate } = getMonthlyBillDateOnlyBounds(year, month);
    return {
        minTxnDate: formatDateOnlyIso(startDate),
        maxTxnDate: formatDateOnlyIso(endDate),
    };
}

export function getMonthlyBillDefaultTxnDate(year: number, month: number, now = new Date()) {
    const { minTxnDate, maxTxnDate } = getMonthlyBillDateOnlyBoundsIso(year, month);
    const today = getMonthlyBillCurrentDateOnly(now);

    return today >= minTxnDate && today <= maxTxnDate ? today : minTxnDate;
}

export function isDateOnlyInMonthlyBillPeriod(date: Date, month: number, year: number) {
    const { startDate, endDate } = getMonthlyBillDateOnlyBounds(year, month);
    return date >= startDate && date <= endDate;
}

export function formatMonthlyBillTimestamp(date: Date): string {
    return formatInTimeZone(date, MONTHLY_BILL_TIME_ZONE, 'MM/dd/yyyy');
}

export function formatMonthlyBillPeriodLabel(year: number, month: number): string {
    return formatInTimeZone(new Date(Date.UTC(year, month - 1, 1, 12)), 'UTC', 'MMMM yyyy');
}
