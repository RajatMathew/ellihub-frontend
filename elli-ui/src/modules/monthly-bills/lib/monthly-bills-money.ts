import Decimal from 'decimal.js';

type MonthlyBillMoneyLike = string | number | Decimal | null | undefined;

const ZERO = new Decimal(0);

export function toMonthlyBillMoneyDecimal(value: MonthlyBillMoneyLike) {
  if (value instanceof Decimal) return value;
  if (value == null) return ZERO;
  if (typeof value === 'number' && !Number.isFinite(value)) return ZERO;
  if (typeof value === 'string' && value.trim() === '') return ZERO;

  try {
    return new Decimal(value);
  } catch {
    return ZERO;
  }
}

export function roundMonthlyBillMoneyDecimal(value: MonthlyBillMoneyLike) {
  return toMonthlyBillMoneyDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function sumMonthlyBillMoney(values: MonthlyBillMoneyLike[]) {
  return roundMonthlyBillMoneyDecimal(
    values.reduce<Decimal>((sum, value) => sum.plus(roundMonthlyBillMoneyDecimal(value)), ZERO)
  ).toNumber();
}
