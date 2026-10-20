import { useEffect, useMemo, useRef, useState } from 'react';

import { Table, TableBody, TableFooter } from '@/app/components/ui/table';
import { useIsMobile } from '@/app/hooks/use-mobile';
import { useResetOnChange } from '@/app/hooks/use-reset-on-change';
import { useTransientFlags } from '@/app/hooks/use-transient-flags';
import { formatCurrency } from '@/app/lib/helpers';
import { MarkPaymentDialog } from '@/modules/monthly-bills/components/mark-payment-dialog';
import { MonthlyBillMobileCard } from '@/modules/monthly-bills/components/monthly-bill-mobile-card';
import { MonthlyBillRow } from '@/modules/monthly-bills/components/monthly-bills-row';
import { MonthlyBillsTableHeader } from '@/modules/monthly-bills/components/monthly-bills-table-header';
import { MonthlyBillsTotalsRow } from '@/modules/monthly-bills/components/monthly-bills-totals-row';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';
import {
  useBulkUpsertPlannedPaymentsMutation,
  useUpsertPlannedPaymentMutation,
} from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import { getProjectTitle, sumPayments } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import {
  formatMonthlyBillMonthName,
  getMonthlyBillMonthNumber,
  getMonthlyBillYear,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { sumMonthlyBillMoney } from '@/modules/monthly-bills/lib/monthly-bills-money';
import type {
  MarkPaymentResult,
  MonthlyBillItem,
  MonthlyBillProjectGroup,
  MonthlyBillsPeriodMeta,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { toast } from 'sonner';

interface MonthlyBillsProjectCardProps {
  group: MonthlyBillProjectGroup;
  period?: MonthlyBillsPeriodMeta;
  selectedDate: Date;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  bulkEditMode: boolean;
  bulkSaveVersion: number;
  bulkCancelVersion: number;
  visibleColumns: Set<MonthlyBillColumnKey>;
  onBulkSaveComplete: (result: { version: number; saved: number; failed: number }) => void;
  onPaymentMarked: (payment: MarkPaymentResult, bill: MonthlyBillItem, amount: number) => void;
}

export function MonthlyBillsProjectCard({
  group,
  period,
  selectedDate,
  canUpdateBills,
  canMarkPayment,
  bulkEditMode,
  bulkSaveVersion,
  bulkCancelVersion,
  visibleColumns,
  onBulkSaveComplete,
  onPaymentMarked,
}: MonthlyBillsProjectCardProps) {
  const monthName = formatMonthlyBillMonthName(selectedDate);
  const month = period?.month ?? getMonthlyBillMonthNumber(selectedDate);
  const year = period?.year ?? getMonthlyBillYear(selectedDate);
  const isMobile = useIsMobile();

  const upsertPlannedPayment = useUpsertPlannedPaymentMutation();
  const bulkUpsertPlannedPayments = useBulkUpsertPlannedPaymentsMutation();
  const handledBulkSaveVersionRef = useRef(bulkSaveVersion);

  const [paymentBill, setPaymentBill] = useState<MonthlyBillItem | null>(null);
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
  // Amounts that were just refused, each shaking its field and holding the
  // error colour for a moment.
  const amountErrors = useTransientFlags();
  const [amountSavingById, setAmountSavingById] = useState<Record<string, boolean>>({});
  const [readySavingById, setReadySavingById] = useState<Record<string, boolean>>({});

  const serverTotals = useMemo(
    () => ({
      paidThisMonth: sumMonthlyBillMoney(group.bills.map((bill) => sumPayments(bill.payments))),
      original: sumMonthlyBillMoney(group.bills.map((bill) => bill.original)),
      totalPaid: sumMonthlyBillMoney(group.bills.map((bill) => bill.totalPaid)),
      balance: sumMonthlyBillMoney(group.bills.map((bill) => bill.balance)),
    }),
    [group.bills]
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
      amountErrors.clear([id]);
      toast.success('Planned payment amount saved.');
    } catch {
      // The mutation hook shows the API error toast; the field shows which one.
      amountErrors.flag([id]);
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
    // Editing the amount answers the error, so it stops showing one.
    amountErrors.clear([id]);
    setToPayById((current) => ({ ...current, [id]: value }));
    if (value <= 0) {
      setReadyById((current) => ({ ...current, [id]: false }));
    }
  };

  // Take in the server's amounts during render whenever they change, so the
  // card never paints a frame of the previous figures.
  useResetOnChange(serverBillStateKey, () => {
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
  });

  // A bulk "Cancel" puts every draft back to its saved amount. Keyed on the
  // cancel alone: the effect this replaces also re-ran whenever the bills or
  // the saved amounts changed, so once any cancel had happened, every refetch
  // reset all rows and cleared edits still in progress — overriding the guard
  // above that leaves a row being edited alone.
  useResetOnChange(bulkCancelVersion, () => {
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
  });

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
    // The one setState this rule still flags here, left deliberately. "Save
    // all" reaches this card as a version counter the parent bumps, so the save
    // itself — and the spinner that has to show before it — can only start in
    // an effect. The fix is structural: the parent's click handler should call
    // each card's save directly. Until then this is the effect doing its job.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBillsAmountSaving(changedBills, true);

    const saveChangedBills = async () => {
      const items = changedBills.map((bill) => {
        const id = bill.purchaseOrder.id;
        const amount = getDraftAmount(bill);

        return {
          purchaseOrderId: id,
          month,
          year,
          amount,
          isReady: amount > 0 && (readyById[id] ?? false),
        };
      });

      try {
        await bulkUpsertPlannedPayments.mutateAsync({ items });

        if (cancelled) return;

        setBillsAmountSaving(changedBills, false);
        setSavedToPayById((current) => ({
          ...current,
          ...Object.fromEntries(items.map((item) => [item.purchaseOrderId, item.amount])),
        }));
        setReadyById((current) => ({
          ...current,
          ...Object.fromEntries(items.map((item) => [item.purchaseOrderId, item.isReady])),
        }));
        setAmountEditingById({});
        onBulkSaveComplete({ version: bulkSaveVersion, saved: items.length, failed: 0 });
      } catch {
        if (cancelled) return;

        setBillsAmountSaving(changedBills, false);
        amountErrors.flag(changedBills.map((bill) => bill.purchaseOrder.id));
        onBulkSaveComplete({ version: bulkSaveVersion, saved: 0, failed: changedBills.length });
      }
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

      {isMobile ? (
        <div className="space-y-3 p-3">
          {group.bills.map((bill) => {
            const id = bill.purchaseOrder.id;
            const amountChanged = hasAmountChanges(bill);
            return (
              <MonthlyBillMobileCard
                key={id}
                bill={bill}
                projectId={group.project.id}
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
                amountErrorToken={amountErrors.flags[id]}
                onToPayChange={(value) => handleToPayChange(id, value)}
                onReadyChange={(checked) => void handleReadyChange(bill, checked)}
                onAmountEdit={() => setAmountEditingById((current) => ({ ...current, [id]: true }))}
                onAmountSave={() => void handleSaveAmount(bill)}
                onMarkPayment={() => setPaymentBill(bill)}
              />
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                    amountErrorToken={amountErrors.flags[id]}
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
      )}

      {paymentBill && period && (
        <MarkPaymentDialog
          key={paymentBill.purchaseOrder.id}
          open={Boolean(paymentBill)}
          onOpenChange={(next) => {
            if (!next) setPaymentBill(null);
          }}
          onPaymentMarked={(payment) => {
            onPaymentMarked(payment, paymentBill, getSavedAmount(paymentBill));
            setPaymentBill(null);
          }}
          bill={paymentBill}
          amount={getSavedAmount(paymentBill)}
          isReady={
            getSavedAmount(paymentBill) > 0 && (readyById[paymentBill.purchaseOrder.id] ?? false)
          }
          period={period}
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
