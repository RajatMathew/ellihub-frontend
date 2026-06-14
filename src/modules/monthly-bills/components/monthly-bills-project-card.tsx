import { useMemo, useState } from 'react';

import { Table, TableBody, TableFooter } from '@/app/components/ui/table';
import { formatCurrency } from '@/app/lib/helpers';
import { MarkPaymentDialog } from '@/modules/monthly-bills/components/mark-payment-dialog';
import { MonthlyBillMobileCard } from '@/modules/monthly-bills/components/monthly-bill-mobile-card';
import { MonthlyBillRow } from '@/modules/monthly-bills/components/monthly-bills-row';
import { MonthlyBillsTableHeader } from '@/modules/monthly-bills/components/monthly-bills-table-header';
import { MonthlyBillsTotalsRow } from '@/modules/monthly-bills/components/monthly-bills-totals-row';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';
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

interface MonthlyBillsProjectCardProps {
  group: MonthlyBillProjectGroup;
  selectedDate: Date;
  canMarkPayment: boolean;
  editMode: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
}

export function MonthlyBillsProjectCard({
  group,
  selectedDate,
  canMarkPayment,
  editMode,
  visibleColumns,
}: MonthlyBillsProjectCardProps) {
  const monthName = format(selectedDate, 'MMMM');
  const monthLabel = format(selectedDate, 'MMMM yyyy').toUpperCase();
  const month = getMonth(selectedDate) + 1;
  const year = getYear(selectedDate);

  const upsertPlannedPayment = useUpsertPlannedPaymentMutation();

  const [paymentBill, setPaymentBill] = useState<MonthlyBillItem | null>(null);
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

  const serverTotals = useMemo(
    () =>
      group.bills.reduce(
        (acc, bill) => {
          acc.paidThisMonth += sumPayments(getMonthPayments(bill, selectedDate));
          acc.totalPaid += bill.totalPaid;
          return acc;
        },
        { paidThisMonth: 0, totalPaid: 0 }
      ),
    [group.bills, selectedDate]
  );

  const toPayTotal = useMemo(
    () => group.bills.reduce((sum, bill) => sum + (toPayById[bill.purchaseOrder.id] ?? 0), 0),
    [group.bills, toPayById]
  );
  const balanceTotal = useMemo(
    () => group.bills.reduce((sum, bill) => sum + bill.balance, 0),
    [group.bills]
  );
  const readyCount = useMemo(
    () => group.bills.filter((bill) => readyById[bill.purchaseOrder.id]).length,
    [group.bills, readyById]
  );

  const totals = { ...serverTotals, toPay: toPayTotal };

  const commitToPay = (purchaseOrderId: string, amount: number) =>
    upsertPlannedPayment.mutate({ purchaseOrderId, month, year, amount });

  const commitReady = (purchaseOrderId: string, isReady: boolean) =>
    upsertPlannedPayment.mutate({
      purchaseOrderId,
      month,
      year,
      amount: toPayById[purchaseOrderId] ?? 0,
      isReady,
    });

  return (
    <section className="border-t first:border-t-0">
      <div className="bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {getProjectTitle(group)}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>
                {group.bills.length} {group.bills.length === 1 ? 'PO' : 'POs'}
              </span>
              <span>{monthLabel}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:min-w-[30rem]">
            <ProjectSummaryItem label="Balance" value={formatCurrency(balanceTotal)} />
            <ProjectSummaryItem label="Planned" value={formatCurrency(toPayTotal)} />
            <ProjectSummaryItem label="Ready" value={`${readyCount}/${group.bills.length}`} />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3 lg:hidden">
        {group.bills.map((bill) => {
          const id = bill.purchaseOrder.id;
          return (
            <MonthlyBillMobileCard
              key={id}
              bill={bill}
              projectId={group.project.id}
              selectedDate={selectedDate}
              toPay={toPayById[id] ?? 0}
              ready={readyById[id] ?? false}
              canMarkPayment={canMarkPayment}
              visibleColumns={visibleColumns}
              editMode={editMode}
              onToPayChange={(value) => setToPayById((current) => ({ ...current, [id]: value }))}
              onToPayCommit={(value) => commitToPay(id, value)}
              onReadyChange={(checked) => {
                setReadyById((current) => ({ ...current, [id]: checked }));
                commitReady(id, checked);
              }}
              onMarkPayment={() => setPaymentBill(bill)}
            />
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <Table className="min-w-[1120px]">
          <MonthlyBillsTableHeader
            monthName={monthName}
            canMarkPayment={canMarkPayment}
            visibleColumns={visibleColumns}
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
                  toPay={toPayById[id] ?? 0}
                  ready={readyById[id] ?? false}
                  canMarkPayment={canMarkPayment}
                  visibleColumns={visibleColumns}
                  editMode={editMode}
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
            <MonthlyBillsTotalsRow
              totals={totals}
              visibleColumns={visibleColumns}
              canMarkPayment={canMarkPayment}
            />
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
    </section>
  );
}

function ProjectSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-background/80 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
