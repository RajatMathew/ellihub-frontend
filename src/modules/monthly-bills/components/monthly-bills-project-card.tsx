import { useEffect, useMemo, useRef, useState } from 'react';

import { Table, TableBody, TableFooter } from '@/app/components/ui/table';
import { formatCurrency } from '@/app/lib/helpers';
import { MarkPaymentDialog } from '@/modules/monthly-bills/components/mark-payment-dialog';
import { MonthlyBillMobileCard } from '@/modules/monthly-bills/components/monthly-bill-mobile-card';
import { MonthlyBillRow } from '@/modules/monthly-bills/components/monthly-bills-row';
import { MonthlyBillsTableHeader } from '@/modules/monthly-bills/components/monthly-bills-table-header';
import { MonthlyBillsTotalsRow } from '@/modules/monthly-bills/components/monthly-bills-totals-row';
import { PaymentMarkedDialog } from '@/modules/monthly-bills/components/payment-marked-dialog';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { monthlyBillsKeys } from '@/modules/monthly-bills/constants/monthly-bills.keys';
import { useUpsertPlannedPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import {
  getMonthPayments,
  getProjectTitle,
  sumPayments,
} from '@/modules/monthly-bills/lib/monthly-bills-bill';
import { sumMonthlyBillMoney } from '@/modules/monthly-bills/lib/monthly-bills-money';
import type {
  MarkPaymentResult,
  MonthlyBillItem,
  MonthlyBillProjectGroup,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { useQueryClient } from '@tanstack/react-query';
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
  const month = getMonth(selectedDate) + 1;
  const year = getYear(selectedDate);

  const queryClient = useQueryClient();
  const upsertPlannedPayment = useUpsertPlannedPaymentMutation();
  const handledBulkSaveVersionRef = useRef(bulkSaveVersion);

  const [paymentBill, setPaymentBill] = useState<MonthlyBillItem | null>(null);
  const [markedPayment, setMarkedPayment] = useState<{
    payment: MarkPaymentResult;
    bill: MonthlyBillItem;
    amount: number;
  } | null>(null);
  const [savedToPayById, setSavedToPayById] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      group.bills.map((bill) => [bill.purchaseOrder.id, bill.plannedPayment?.amount ?? 0])
    )
  );
  const [toPayById, setToPayById] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      group.bills.map((bill) => [bill.purchaseOrder.id, bill.plannedPayment?.amount ?? 0])
    )
  );
  const [readyById, setReadyById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      group.bills.map((bill) => [
        bill.purchaseOrder.id,
        (bill.plannedPayment?.amount ?? 0) > 0 && (bill.plannedPayment?.isReady ?? false),
      ])
    )
  );
  const [amountEditingById, setAmountEditingById] = useState<Record<string, boolean>>({});
  const [amountSavingById, setAmountSavingById] = useState<Record<string, boolean>>({});
  const [readySavingById, setReadySavingById] = useState<Record<string, boolean>>({});

  const serverTotals = useMemo(
    () => ({
      paidThisMonth: sumMonthlyBillMoney(
        group.bills.map((bill) => sumPayments(getMonthPayments(bill, selectedDate)))
      ),
      original: sumMonthlyBillMoney(group.bills.map((bill) => bill.original)),
      totalPaid: sumMonthlyBillMoney(group.bills.map((bill) => bill.totalPaid)),
      balance: sumMonthlyBillMoney(group.bills.map((bill) => bill.balance)),
    }),
    [group.bills, selectedDate]
  );

  const toPayTotal = useMemo(
    () => sumMonthlyBillMoney(group.bills.map((bill) => toPayById[bill.purchaseOrder.id] ?? 0)),
    [group.bills, toPayById]
  );
  const balanceTotal = useMemo(
    () => sumMonthlyBillMoney(group.bills.map((bill) => bill.balance)),
    [group.bills]
  );
  const readyCount = useMemo(
    () =>
      group.bills.filter((bill) => {
        const id = bill.purchaseOrder.id;
        return (toPayById[id] ?? 0) > 0 && (readyById[id] ?? false);
      }).length,
    [group.bills, readyById, toPayById]
  );

  const totals = { ...serverTotals, toPay: toPayTotal };
  const serverBillStateKey = useMemo(
    () =>
      group.bills
        .map(
          (bill) =>
            `${bill.purchaseOrder.id}:${bill.plannedPayment?.amount ?? 0}:${
              bill.plannedPayment?.isReady ?? false
            }`
        )
        .join('|'),
    [group.bills]
  );

  const getSavedAmount = (bill: MonthlyBillItem) =>
    savedToPayById[bill.purchaseOrder.id] ?? bill.plannedPayment?.amount ?? 0;

  const getDraftAmount = (bill: MonthlyBillItem) => toPayById[bill.purchaseOrder.id] ?? 0;

  const hasAmountChanges = (bill: MonthlyBillItem) => {
    return getDraftAmount(bill) !== getSavedAmount(bill);
  };

  const canRecordPayment = (bill: MonthlyBillItem) => {
    const id = bill.purchaseOrder.id;
    return Boolean(
      canMarkPayment &&
      (readyById[id] ?? false) &&
      getSavedAmount(bill) > 0 &&
      !hasAmountChanges(bill) &&
      !(amountSavingById[id] ?? false) &&
      !(readySavingById[id] ?? false)
    );
  };

  const handleSaveAmount = async (bill: MonthlyBillItem) => {
    const id = bill.purchaseOrder.id;
    const amount = getDraftAmount(bill);
    const currentReady = readyById[id] ?? false;
    const nextReady = amount > 0 && currentReady;

    if (!hasAmountChanges(bill) && nextReady === currentReady) {
      setAmountEditingById((current) => ({ ...current, [id]: false }));
      return;
    }

    setAmountSavingById((current) => ({ ...current, [id]: true }));

    try {
      await upsertPlannedPayment.mutateAsync({
        purchaseOrderId: id,
        month,
        year,
        amount,
        isReady: nextReady,
      });
      setSavedToPayById((current) => ({ ...current, [id]: amount }));
      setReadyById((current) => ({ ...current, [id]: nextReady }));
      setAmountEditingById((current) => ({ ...current, [id]: false }));
      toast.success('Planned payment amount saved.');
    } catch {
      // The mutation hook shows the API error toast.
    } finally {
      setAmountSavingById((current) => ({ ...current, [id]: false }));
    }
  };

  const handleReadyChange = async (bill: MonthlyBillItem, checked: boolean) => {
    const id = bill.purchaseOrder.id;
    const amount = getDraftAmount(bill);
    const previous = readyById[id] ?? false;

    if (checked && amount <= 0) {
      setReadyById((current) => ({ ...current, [id]: false }));
      return;
    }

    setReadyById((current) => ({ ...current, [id]: checked }));
    setReadySavingById((current) => ({ ...current, [id]: true }));

    try {
      await upsertPlannedPayment.mutateAsync({
        purchaseOrderId: id,
        month,
        year,
        amount,
        isReady: checked,
      });
      setSavedToPayById((current) => ({ ...current, [id]: amount }));
      setAmountEditingById((current) => ({ ...current, [id]: false }));
      toast.success(checked ? 'Bill marked ready.' : 'Bill marked not ready.');
    } catch {
      setReadyById((current) => ({ ...current, [id]: previous }));
      // The mutation hook shows the API error toast.
    } finally {
      setReadySavingById((current) => ({ ...current, [id]: false }));
    }
  };

  const setBillsAmountSaving = (bills: MonthlyBillItem[], isSaving: boolean) => {
    setAmountSavingById((current) => ({
      ...current,
      ...Object.fromEntries(bills.map((bill) => [bill.purchaseOrder.id, isSaving])),
    }));
  };

  const handleToPayChange = (id: string, value: number) => {
    setToPayById((current) => ({ ...current, [id]: value }));
    if (value <= 0) {
      setReadyById((current) => ({ ...current, [id]: false }));
    }
  };

  useEffect(() => {
    const serverAmounts = Object.fromEntries(
      group.bills.map((bill) => [bill.purchaseOrder.id, bill.plannedPayment?.amount ?? 0])
    );
    const serverReady = Object.fromEntries(
      group.bills.map((bill) => [
        bill.purchaseOrder.id,
        (bill.plannedPayment?.amount ?? 0) > 0 && (bill.plannedPayment?.isReady ?? false),
      ])
    );

    setSavedToPayById((current) => ({ ...current, ...serverAmounts }));
    setReadyById((current) => ({ ...current, ...serverReady }));
    setToPayById((current) => {
      const next = { ...current };
      group.bills.forEach((bill) => {
        const id = bill.purchaseOrder.id;
        if (!bulkEditMode && !(amountEditingById[id] ?? false)) {
          next[id] = Number(serverAmounts[id] ?? 0);
        }
      });
      return next;
    });
  }, [serverBillStateKey]);

  useEffect(() => {
    if (bulkCancelVersion === 0) return;

    const serverReady = Object.fromEntries(
      group.bills.map((bill) => [
        bill.purchaseOrder.id,
        (bill.plannedPayment?.amount ?? 0) > 0 && (bill.plannedPayment?.isReady ?? false),
      ])
    );

    setToPayById((current) => {
      const next = { ...current };
      group.bills.forEach((bill) => {
        next[bill.purchaseOrder.id] = getSavedAmount(bill);
      });
      return next;
    });
    setReadyById((current) => ({ ...current, ...serverReady }));
    setAmountEditingById({});
  }, [bulkCancelVersion, group.bills, savedToPayById]);

  useEffect(() => {
    if (bulkSaveVersion === 0 || handledBulkSaveVersionRef.current === bulkSaveVersion) {
      return;
    }

    handledBulkSaveVersionRef.current = bulkSaveVersion;

    const changedBills = group.bills.filter(hasAmountChanges);
    if (changedBills.length === 0) {
      onBulkSaveComplete({ version: bulkSaveVersion, saved: 0, failed: 0 });
      return;
    }

    let cancelled = false;
    setBillsAmountSaving(changedBills, true);

    const saveChangedBills = async () => {
      const results = await Promise.allSettled(
        changedBills.map((bill) =>
          upsertPlannedPayment.mutateAsync({
            purchaseOrderId: bill.purchaseOrder.id,
            month,
            year,
            amount: getDraftAmount(bill),
            isReady: getDraftAmount(bill) > 0 && (readyById[bill.purchaseOrder.id] ?? false),
          })
        )
      );

      if (cancelled) return;

      setBillsAmountSaving(changedBills, false);

      const failed = results.filter((result) => result.status === 'rejected').length;
      const saved = results.length - failed;

      setSavedToPayById((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;
          const bill = changedBills[index];
          next[bill.purchaseOrder.id] = getDraftAmount(bill);
        });
        return next;
      });
      setReadyById((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;
          const bill = changedBills[index];
          const id = bill.purchaseOrder.id;
          next[id] = getDraftAmount(bill) > 0 && (current[id] ?? false);
        });
        return next;
      });

      if (failed === 0) setAmountEditingById({});

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
            <h3 className="truncate text-base font-semibold text-foreground">
              {getProjectTitle(group)}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>
                {group.bills.length} {group.bills.length === 1 ? 'PO' : 'POs'}
              </span>
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
          const amountChanged = hasAmountChanges(bill);
          return (
            <MonthlyBillMobileCard
              key={id}
              bill={bill}
              projectId={group.project.id}
              selectedDate={selectedDate}
              toPay={getDraftAmount(bill)}
              ready={getDraftAmount(bill) > 0 && (readyById[id] ?? false)}
              canUpdateBills={canUpdateBills}
              canMarkPayment={canMarkPayment}
              canRecordPayment={canRecordPayment(bill)}
              visibleColumns={visibleColumns}
              isBulkEditing={bulkEditMode}
              isAmountEditing={amountEditingById[id] ?? false}
              isAmountSaving={amountSavingById[id] ?? false}
              isReadySaving={readySavingById[id] ?? false}
              hasAmountChanges={amountChanged}
              onToPayChange={(value) => handleToPayChange(id, value)}
              onReadyChange={(checked) => void handleReadyChange(bill, checked)}
              onAmountEdit={() => setAmountEditingById((current) => ({ ...current, [id]: true }))}
              onAmountSave={() => void handleSaveAmount(bill)}
              onMarkPayment={() => setPaymentBill(bill)}
            />
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <Table className="min-w-230">
          <MonthlyBillsTableHeader
            monthName={monthName}
            canUpdateBills={canUpdateBills}
            canMarkPayment={canMarkPayment}
            visibleColumns={visibleColumns}
          />

          <TableBody>
            {group.bills.map((bill) => {
              const id = bill.purchaseOrder.id;
              const amountChanged = hasAmountChanges(bill);
              return (
                <MonthlyBillRow
                  key={id}
                  bill={bill}
                  projectId={group.project.id}
                  selectedDate={selectedDate}
                  toPay={getDraftAmount(bill)}
                  ready={getDraftAmount(bill) > 0 && (readyById[id] ?? false)}
                  canUpdateBills={canUpdateBills}
                  canMarkPayment={canMarkPayment}
                  canRecordPayment={canRecordPayment(bill)}
                  visibleColumns={visibleColumns}
                  isBulkEditing={bulkEditMode}
                  isAmountEditing={amountEditingById[id] ?? false}
                  isAmountSaving={amountSavingById[id] ?? false}
                  isReadySaving={readySavingById[id] ?? false}
                  hasAmountChanges={amountChanged}
                  onToPayChange={(value) => handleToPayChange(id, value)}
                  onReadyChange={(checked) => void handleReadyChange(bill, checked)}
                  onAmountEdit={() =>
                    setAmountEditingById((current) => ({ ...current, [id]: true }))
                  }
                  onAmountSave={() => void handleSaveAmount(bill)}
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
          onPaymentMarked={(payment) => {
            setMarkedPayment({
              payment,
              bill: paymentBill,
              amount: getSavedAmount(paymentBill),
            });
            setPaymentBill(null);
          }}
          bill={paymentBill}
          amount={getSavedAmount(paymentBill)}
          isReady={
            getSavedAmount(paymentBill) > 0 && (readyById[paymentBill.purchaseOrder.id] ?? false)
          }
          month={month}
          year={year}
        />
      )}

      {markedPayment && (
        <PaymentMarkedDialog
          open={Boolean(markedPayment)}
          onOpenChange={(next) => {
            if (!next) {
              setMarkedPayment(null);
              void queryClient.invalidateQueries({ queryKey: monthlyBillsKeys.all });
            }
          }}
          payment={markedPayment.payment}
          amount={markedPayment.amount}
          vendorName={markedPayment.bill.purchaseOrder.vendor.name}
          poNumber={markedPayment.bill.purchaseOrder.poNumber}
          balance={markedPayment.bill.balance}
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
