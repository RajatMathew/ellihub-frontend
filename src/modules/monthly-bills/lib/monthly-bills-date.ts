import { endOfMonth, format, getMonth, getYear, startOfMonth } from 'date-fns';

export function getInitialMonthlyBillDate() {
  return startOfMonth(new Date());
}

export function isCurrentMonthlyBillDate(date: Date, now = new Date()) {
  return getMonth(date) === getMonth(now) && getYear(date) === getYear(now);
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
    return new Date(year, month - 1, 1);
  }

  return initialDate;
}

export function getMonthlyBillMonthNumber(date: Date) {
  return getMonth(date) + 1;
}

export function formatMonthlyBillMonthNumber(date: Date) {
  return format(date, 'MM');
}

/** Inclusive ISO start/end dates spanning the calendar month of `date`. */
export function getMonthlyBillDateRange(date: Date) {
  return {
    startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

export function getMonthlyBillMonthSearch(date: Date) {
  const params = new URLSearchParams();
  params.set('month', formatMonthlyBillMonthNumber(date));
  params.set('year', String(getYear(date)));
  return `?${params.toString()}`;
}
