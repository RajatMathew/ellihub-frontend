import type {
  MonthlyBillItem,
  MonthlyBillProjectGroup,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';

import { getMonthlyBillPeriod } from './monthly-bills-date';
import { sumMonthlyBillMoney } from './monthly-bills-money';

export function getProjectTitle(group: MonthlyBillProjectGroup) {
  return group.project.jobNumber
    ? `${group.project.jobNumber} ${group.project.name}`
    : group.project.name;
}

/**
 * A project card's identity: the project, in the selected month. Switching
 * months gives a fresh card.
 *
 * Deliberately nothing about the bills. This key used to carry every bill's
 * planned amount and Ready flag, so the card remounted to re-seed its inputs
 * whenever one was saved — and a remount replaces the table's scroll
 * container, so toggling Ready on a table scrolled right threw it back to the
 * start, and dropped any other row's edit in progress with it. The card takes
 * in new server values itself (`useResetOnChange` on its bill state), without
 * being rebuilt.
 */
export function getProjectCardKey(group: MonthlyBillProjectGroup, selectedDate: Date) {
  const { month, year } = getMonthlyBillPeriod(selectedDate);
  return `${group.project.id}:${year}-${month}`;
}

export function sumPayments(payments: MonthlyBillItem['payments']) {
  return sumMonthlyBillMoney(payments.map((payment) => payment.amount));
}
