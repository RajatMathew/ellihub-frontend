export const MONTHLY_BILL_TIME_ZONE = 'America/New_York';

export interface MonthlyBillPeriod {
  month: number;
  year: number;
}

const zonedDatePartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MONTHLY_BILL_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const monthNameFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'long',
});

const monthShortFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
});

function padTwo(value: number) {
  return String(value).padStart(2, '0');
}

function getZonedDateParts(date = new Date()) {
  const parts = zonedDatePartsFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function isMonthlyBillPeriodAfter(left: MonthlyBillPeriod, right: MonthlyBillPeriod) {
  return left.year > right.year || (left.year === right.year && left.month > right.month);
}

export function createMonthlyBillDate(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 12));
}

export function getCurrentMonthlyBillPeriod(now = new Date()): MonthlyBillPeriod {
  const { year, month } = getZonedDateParts(now);
  return { year, month };
}

export function getInitialMonthlyBillDate(now = new Date()) {
  const { year, month } = getCurrentMonthlyBillPeriod(now);
  return createMonthlyBillDate(year, month);
}

export function getMonthlyBillPeriod(date: Date): MonthlyBillPeriod {
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

export function getMonthlyBillDateFromSearch(searchParams: URLSearchParams) {
  const initialDate = getInitialMonthlyBillDate();
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));

  if (
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    Number.isInteger(year) &&
    year >= 1970
  ) {
    const parsed = { month, year };
    const current = getCurrentMonthlyBillPeriod();
    if (isMonthlyBillPeriodAfter(parsed, current)) return initialDate;

    return createMonthlyBillDate(year, month);
  }

  return initialDate;
}

export function getMonthlyBillMonthNumber(date: Date) {
  return getMonthlyBillPeriod(date).month;
}

export function getMonthlyBillYear(date: Date) {
  return getMonthlyBillPeriod(date).year;
}

export function formatMonthlyBillMonthNumber(date: Date) {
  return padTwo(getMonthlyBillMonthNumber(date));
}

export function formatMonthlyBillMonthName(date: Date, variant: 'short' | 'long' = 'long') {
  const { month, year } = getMonthlyBillPeriod(date);
  const formatter = variant === 'short' ? monthShortFormatter : monthNameFormatter;
  return formatter.format(createMonthlyBillDate(year, month));
}

export function getMonthlyBillMonthSearch(date: Date) {
  const { month, year } = getMonthlyBillPeriod(date);
  const params = new URLSearchParams();
  params.set('month', padTwo(month));
  params.set('year', String(year));
  return `?${params.toString()}`;
}

export function formatDateOnlyLabel(
  dateOnly: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = createMonthlyBillDate(year, month);
  date.setUTCDate(day);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(date);
}
