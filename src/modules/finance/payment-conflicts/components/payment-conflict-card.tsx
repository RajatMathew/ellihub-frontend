import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { PaymentConflictItemRow } from '@/modules/finance/payment-conflicts/components/payment-conflict-item-row';
import {
  formatConflictMoney,
  formatConflictShortDate,
  getReferenceLabel,
} from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type {
  PaymentConflict,
  PaymentConflictItem,
  PaymentConflictStatus,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { CheckCheck, Loader2, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PaymentConflictCardProps {
  conflict: PaymentConflict;
  itemStatus: PaymentConflictStatus;
  canResolve: boolean;
  isRechecking: boolean;
  acceptingItemIds: string[];
  onRecheck: (conflictId: string) => void;
  onAccept: (conflictId: string, items: Array<{ id: string; version: number }>) => void;
}

export function PaymentConflictCard({
  conflict,
  canResolve,
  itemStatus,
  isRechecking,
  acceptingItemIds,
  onRecheck,
  onAccept,
}: PaymentConflictCardProps) {
  const [pendingItems, setPendingItems] = useState<PaymentConflictItem[] | null>(null);
  const visibleItems = conflict.items.filter((item) => item.status === itemStatus);
  const activeItems = visibleItems.filter((item) => item.status === 'ACTIVE');
  const isActive = itemStatus === 'ACTIVE';
  const canAcceptAll =
    activeItems.length > 0 && activeItems.every((item) => item.canAcceptQuickBooks);
  const currency =
    conflict.latestQuickBooks?.currencyCode ?? conflict.baseline.currencyCode ?? 'USD';
  const displayedAmount = conflict.latestQuickBooks?.totalAmount ?? conflict.payment.amount;
  const displayedDate = conflict.latestQuickBooks?.paymentDate ?? conflict.payment.txnDate;
  const displayedVendor =
    getReferenceLabel(conflict, conflict.latestQuickBooks?.vendorId) ??
    conflict.purchaseOrder.vendor.name;
  const poNumber = conflict.purchaseOrder.poNumber.startsWith('#')
    ? conflict.purchaseOrder.poNumber
    : `#${conflict.purchaseOrder.poNumber}`;
  const purchaseOrderPath = `/app/project/${encodeURIComponent(
    conflict.purchaseOrder.project.id
  )}/purchase-orders/${encodeURIComponent(conflict.purchaseOrder.id)}/edit`;

  const confirmAcceptance = () => {
    if (!pendingItems) return;
    onAccept(
      conflict.id,
      pendingItems.map((item) => ({ id: item.id, version: item.version }))
    );
    setPendingItems(null);
  };

  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-none">
      <header className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {formatConflictMoney(displayedAmount, currency)}
            </p>
            <p className="text-sm font-medium text-foreground">{displayedVendor}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            <span>{conflict.purchaseOrder.project.name}</span>
            <span aria-hidden="true">&middot;</span>
            <Link
              to={purchaseOrderPath}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              PO {poNumber}
            </Link>
            <span aria-hidden="true">&middot;</span>
            <time dateTime={displayedDate}>{formatConflictShortDate(displayedDate)}</time>
          </div>
        </div>

        {isActive ? (
          <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
            <Button
              variant="dim"
              size="sm"
              className="flex-1 sm:flex-none"
              disabled={!canResolve || isRechecking || acceptingItemIds.length > 0}
              onClick={() => onRecheck(conflict.id)}
            >
              {isRechecking ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
              Recheck
            </Button>
            <span
              className="flex-1 sm:flex-none"
              title={canAcceptAll ? undefined : conflict.acceptBlockedReasons[0]}
            >
              <Button
                size="sm"
                className="w-full"
                disabled={!canResolve || !canAcceptAll || acceptingItemIds.length > 0}
                onClick={() => setPendingItems(activeItems)}
              >
                {acceptingItemIds.length > 0 ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCheck />
                )}
                Accept all
              </Button>
            </span>
          </div>
        ) : null}
      </header>

      <div className="space-y-2 border-t border-border p-3">
        {visibleItems.map((item) => (
          <PaymentConflictItemRow
            key={item.id}
            conflict={conflict}
            item={item}
            canResolve={canResolve}
            isAccepting={acceptingItemIds.includes(item.id)}
            onAccept={(selectedItem) => setPendingItems([selectedItem])}
          />
        ))}
      </div>

      <AlertDialog
        open={pendingItems !== null}
        onOpenChange={(open) => {
          if (!open) setPendingItems(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Accept{' '}
              {pendingItems?.length === 1 ? 'this QuickBooks change' : 'all QuickBooks changes'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Elli will update {pendingItems?.length === 1 ? 'the selected field' : 'these fields'}{' '}
              to the latest QuickBooks values. Unrelated active conflicts will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAcceptance}>Accept into Elli</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
