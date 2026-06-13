import { Card } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Table, TableBody, TableCell, TableFooter, TableRow } from '@/app/components/ui/table';
import { formatCurrency } from '@/app/lib/helpers';
import { MarkPaymentDialog } from '@/modules/monthly-bills/components/mark-payment-dialog';
import { MonthlyBillRow } from '@/modules/monthly-bills/components/monthly-bills-row';
import { MonthlyBillsTableHeader } from '@/modules/monthly-bills/components/monthly-bills-table-header';
import { useUpsertPlannedPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import {
  getMonthPayments,
  getProjectTitle,
  sumPayments,
} from '@/modules/monthly-bills/lib/monthly-bills-bill';
import type {
  MonthlyBillItem,
  MonthlyBillProjectGroup,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { format, getMonth, getYear } from 'date-fns';
import { useMemo, useState } from 'react';

interface MonthlyBillsProjectCardProps {
  group: MonthlyBillProjectGroup;
  selectedDate: Date;
  canMarkPayment: boolean;
}

export function MonthlyBillsProjectCard({
  group,
  selectedDate,
  canMarkPayment,
}: MonthlyBillsProjectCardProps) {
  const monthName = format(selectedDate, 'MMMM');
  const monthLabel = format(selectedDate, 'MMMM yyyy').toUpperCase();
  const month = getMonth(selectedDate) + 1;
  const year = getYear(selectedDate);

  const upsertPlannedPayment = useUpsertPlannedPaymentMutation();

  const [paymentBill, setPaymentBill] = useState<MonthlyBillItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [toPayById, setToPayById] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      group.bills.map((bill) => [bill.purchaseOrder.id, bill.plannedPayment?.amount ?? 0])
    )
  );
  const [readyById, setReadyById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      group.bills.map((bill) => [bill.purchaseOrder.id, bill.plannedPayment?.isReady ?? false])
    )
  );

  const billIds = useMemo(() => group.bills.map((bill) => bill.purchaseOrder.id), [group.bills]);
  const allSelected = billIds.length > 0 && billIds.every((id) => selectedIds.has(id));
  const someSelected = billIds.some((id) => selectedIds.has(id));

  const totals = useMemo(() => {
    return group.bills.reduce(
      (acc, bill) => {
        acc.paidThisMonth += sumPayments(getMonthPayments(bill, selectedDate));
        acc.totalPaid += bill.totalPaid;
        acc.toPay += toPayById[bill.purchaseOrder.id] ?? 0;
        return acc;
      },
      { paidThisMonth: 0, totalPaid: 0, toPay: 0 }
    );
  }, [group.bills, selectedDate, toPayById]);

  const toggleAll = (checked: boolean) => setSelectedIds(checked ? new Set(billIds) : new Set());

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const commitToPay = (purchaseOrderId: string, amount: number) =>
    upsertPlannedPayment.mutate({ purchaseOrderId, month, year, amount });

  // The endpoint requires an amount, so send the row's current To Pay value alongside the flag.
  const commitReady = (purchaseOrderId: string, isReady: boolean) =>
    upsertPlannedPayment.mutate({
      purchaseOrderId,
      month,
      year,
      amount: toPayById[purchaseOrderId] ?? 0,
      isReady,
    });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">{getProjectTitle(group)}</h3>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {monthLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-5xl">
          <MonthlyBillsTableHeader
            monthName={monthName}
            canMarkPayment={canMarkPayment}
            selectAllSlot={
              <Checkbox
                size="sm"
                aria-label="Select all purchase orders"
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={(checked) => toggleAll(checked === true)}
              />
            }
          />

          <TableBody>
            {group.bills.map((bill) => {
              const id = bill.purchaseOrder.id;
              return (
                <MonthlyBillRow
                  key={id}
                  bill={bill}
                  projectId={group.project.id}
                  selectedDate={selectedDate}
                  selected={selectedIds.has(id)}
                  toPay={toPayById[id] ?? 0}
                  ready={readyById[id] ?? false}
                  canMarkPayment={canMarkPayment}
                  onToggle={(checked) => toggleOne(id, checked)}
                  onToPayChange={(value) =>
                    setToPayById((current) => ({ ...current, [id]: value }))
                  }
                  onToPayCommit={(value) => commitToPay(id, value)}
                  onReadyChange={(checked) => {
                    setReadyById((current) => ({ ...current, [id]: checked }));
                    commitReady(id, checked);
                  }}
                  onMarkPayment={() => setPaymentBill(bill)}
                />
              );
            })}
          </TableBody>

          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={4}
                className="py-3 text-right text-sm font-semibold text-foreground"
              >
                Totals
              </TableCell>
              <TableCell />
              <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
                {formatCurrency(totals.paidThisMonth)}
              </TableCell>
              <TableCell />
              <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
                {formatCurrency(totals.totalPaid)}
              </TableCell>
              <TableCell />
              <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
                {formatCurrency(totals.toPay)}
              </TableCell>
              <TableCell />
              {canMarkPayment && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {paymentBill && (
        <MarkPaymentDialog
          key={paymentBill.purchaseOrder.id}
          open={Boolean(paymentBill)}
          onOpenChange={(next) => {
            if (!next) setPaymentBill(null);
          }}
          bill={paymentBill}
          amount={toPayById[paymentBill.purchaseOrder.id] ?? 0}
          month={month}
          year={year}
        />
      )}
    </Card>
  );
}
