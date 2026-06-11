export function getInitialMonthlyBillDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
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
  return date.getMonth() + 1;
}

export function formatMonthlyBillMonthNumber(date: Date) {
  return String(getMonthlyBillMonthNumber(date)).padStart(2, '0');
}

export function getMonthlyBillMonthSearch(date: Date) {
  const params = new URLSearchParams();
  params.set('month', formatMonthlyBillMonthNumber(date));
  params.set('year', String(date.getFullYear()));
  return `?${params.toString()}`;
}
