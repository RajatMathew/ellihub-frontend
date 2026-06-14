import { useEffect, useMemo, useState } from 'react';

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
import { toast } from 'sonner';

interface MonthlyBillsProjectCardProps {
  group: MonthlyBillProjectGroup;
  selectedDate: Date;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  bulkEditMode: boolean;
  bulkSaveVersion: number;
  bulkCancelVersion: number;
  visibleColumns: Set<MonthlyBillColumnKey>;
  onBulkSaveComplete: (result: { version: number; saved: number; failed: number }) => void;
}

export function MonthlyBillsProjectCard({
  group,
  selectedDate,
  canUpdateBills,
  canMarkPayment,
  bulkEditMode,
  bulkSaveVersion,
  bulkCancelVersion,
  visibleColumns,
  onBulkSaveComplete,
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
  const [editingById, setEditingById] = useState<Record<string, boolean>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});

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

  const resetBillDraft = (bill: MonthlyBillItem) => {
    const id = bill.purchaseOrder.id;
    setToPayById((current) => ({ ...current, [id]: bill.plannedPayment?.amount ?? 0 }));
    setReadyById((current) => ({ ...current, [id]: bill.plannedPayment?.isReady ?? false }));
  };

  const hasBillChanges = (bill: MonthlyBillItem) => {
    const id = bill.purchaseOrder.id;
    return (
      (toPayById[id] ?? 0) !== (bill.plannedPayment?.amount ?? 0) ||
      (readyById[id] ?? false) !== (bill.plannedPayment?.isReady ?? false)
    );
  };

  const handleSaveBill = async (bill: MonthlyBillItem) => {
    const id = bill.purchaseOrder.id;
    setSavingById((current) => ({ ...current, [id]: true }));

    try {
      await upsertPlannedPayment.mutateAsync({
        purchaseOrderId: id,
        month,
        year,
        amount: toPayById[id] ?? 0,
        isReady: readyById[id] ?? false,
      });
      setEditingById((current) => ({ ...current, [id]: false }));
      toast.success('Planned payment saved.');
    } catch {
      // The mutation hook shows the API error toast.
    } finally {
      setSavingById((current) => ({ ...current, [id]: false }));
    }
  };

  const handleCancelEdit = (bill: MonthlyBillItem) => {
    const id = bill.purchaseOrder.id;
    resetBillDraft(bill);
    setEditingById((current) => ({ ...current, [id]: false }));
  };

  const setBillsSaving = (bills: MonthlyBillItem[], isSaving: boolean) => {
    setSavingById((current) => ({
      ...current,
      ...Object.fromEntries(bills.map((bill) => [bill.purchaseOrder.id, isSaving])),
    }));
  };

  useEffect(() => {
    if (bulkCancelVersion === 0) return;

    group.bills.forEach(resetBillDraft);
    setEditingById({});
  }, [bulkCancelVersion, group.bills]);

  useEffect(() => {
    if (bulkSaveVersion === 0) return;

    const changedBills = group.bills.filter(hasBillChanges);
    if (changedBills.length === 0) {
      onBulkSaveComplete({ version: bulkSaveVersion, saved: 0, failed: 0 });
      return;
    }

    let cancelled = false;
    setBillsSaving(changedBills, true);

    const saveChangedBills = async () => {
      const results = await Promise.allSettled(
        changedBills.map((bill) =>
          upsertPlannedPayment.mutateAsync({
            purchaseOrderId: bill.purchaseOrder.id,
            month,
            year,
            amount: toPayById[bill.purchaseOrder.id] ?? 0,
            isReady: readyById[bill.purchaseOrder.id] ?? false,
          })
        )
      );

      if (cancelled) return;

      setBillsSaving(changedBills, false);

      const failed = results.filter((result) => result.status === 'rejected').length;
      const saved = results.length - failed;

      if (failed === 0) {
        setEditingById({});
      }

      onBulkSaveComplete({ version: bulkSaveVersion, saved, failed });
    };

    void saveChangedBills();

    return () => {
      cancelled = true;
    };
  }, [bulkSaveVersion]);

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
              canUpdateBills={canUpdateBills}
              canMarkPayment={canMarkPayment}
              visibleColumns={visibleColumns}
              isBulkEditing={bulkEditMode}
              isEditing={bulkEditMode || (editingById[id] ?? false)}
              isSaving={savingById[id] ?? false}
              hasChanges={hasBillChanges(bill)}
              onToPayChange={(value) => setToPayById((current) => ({ ...current, [id]: value }))}
              onReadyChange={(checked) =>
                setReadyById((current) => ({ ...current, [id]: checked }))
              }
              onEdit={() => setEditingById((current) => ({ ...current, [id]: true }))}
              onCancelEdit={() => handleCancelEdit(bill)}
              onSave={() => void handleSaveBill(bill)}
              onMarkPayment={() => setPaymentBill(bill)}
            />
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <Table className="min-w-[1120px]">
          <MonthlyBillsTableHeader
            monthName={monthName}
            canUpdateBills={canUpdateBills}
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
                  canUpdateBills={canUpdateBills}
                  canMarkPayment={canMarkPayment}
                  visibleColumns={visibleColumns}
                  isBulkEditing={bulkEditMode}
                  isEditing={bulkEditMode || (editingById[id] ?? false)}
                  isSaving={savingById[id] ?? false}
                  hasChanges={hasBillChanges(bill)}
                  onToPayChange={(value) =>
                    setToPayById((current) => ({ ...current, [id]: value }))
                  }
                  onReadyChange={(checked) =>
                    setReadyById((current) => ({ ...current, [id]: checked }))
                  }
                  onEdit={() => setEditingById((current) => ({ ...current, [id]: true }))}
                  onCancelEdit={() => handleCancelEdit(bill)}
                  onSave={() => void handleSaveBill(bill)}
                  onMarkPayment={() => setPaymentBill(bill)}
                />
              );
            })}
          </TableBody>

          <TableFooter>
            <MonthlyBillsTotalsRow
              totals={totals}
              visibleColumns={visibleColumns}
              canUpdateBills={canUpdateBills}
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
          isReady={readyById[paymentBill.purchaseOrder.id] ?? false}
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
