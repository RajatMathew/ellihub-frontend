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
 * A key derived from the group's server data for the selected month. Changing it remounts the
 * card so the planned payment / Ready inputs re-seed from fresh server values (e.g. after a save refetch
 * or switching months), while leaving them untouched while the user is editing.
 */
export function getProjectCardKey(group: MonthlyBillProjectGroup, selectedDate: Date) {
  const { month, year } = getMonthlyBillPeriod(selectedDate);
  const period = `${year}-${month}`;
  const bills = group.bills
    .map(
      (bill) =>
        `${bill.purchaseOrder.id}:${bill.plannedPayment?.amount ?? 0}:${
          bill.plannedPayment?.isReady ?? false
        }`
    )
    .join('|');
  return `${group.project.id}:${period}:${bills}`;
}

export function sumPayments(payments: MonthlyBillItem['payments']) {
  return sumMonthlyBillMoney(payments.map((payment) => payment.amount));
}
