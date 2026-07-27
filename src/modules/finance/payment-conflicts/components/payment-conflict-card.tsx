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
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { PaymentConflictItemRow } from '@/modules/finance/payment-conflicts/components/payment-conflict-item-row';
import {
  detectionSourceLabels,
  formatConflictDate,
  formatConflictMoney,
} from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type {
  PaymentConflict,
  PaymentConflictItem,
  PaymentConflictStatus,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { CheckCheck, ExternalLink, Loader2, RefreshCcw } from 'lucide-react';
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
  const currency = conflict.baseline.currencyCode ?? 'USD';
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
    <Card className="overflow-hidden border-border/80 shadow-none">
      <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={purchaseOrderPath}
              className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              PO {conflict.purchaseOrder.poNumber}
            </Link>
            <span className="text-sm text-muted-foreground">
              {conflict.purchaseOrder.vendor.name}
            </span>
            <Badge variant={isActive ? 'warning' : 'success'} appearance="light" size="xs">
              {visibleItems.length} {visibleItems.length === 1 ? 'conflict' : 'conflicts'}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {conflict.purchaseOrder.project.name}
            {conflict.purchaseOrder.project.jobNumber
              ? ` - Job ${conflict.purchaseOrder.project.jobNumber}`
              : ''}
            {' - '}
            {detectionSourceLabels[conflict.detectionSource]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">Payment </span>
            <span className="font-medium text-foreground">
              {formatConflictMoney(conflict.payment.amount, currency)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Date </span>
            <span className="font-medium text-foreground">
              {formatConflictDate(conflict.payment.txnDate)}
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/70">
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

      <div className="flex flex-col gap-2 border-t border-border/80 bg-muted/10 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="truncate text-xs text-muted-foreground">
          QuickBooks transaction {conflict.payment.transactionId}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={conflict.payment.transactionUrl} target="_blank" rel="noreferrer">
              Fix in QuickBooks <ExternalLink />
            </a>
          </Button>
          {isActive && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!canResolve || isRechecking || acceptingItemIds.length > 0}
                onClick={() => onRecheck(conflict.id)}
              >
                {isRechecking ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                Recheck
              </Button>
              <span title={canAcceptAll ? undefined : conflict.acceptBlockedReasons[0]}>
                <Button
                  size="sm"
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
            </>
          )}
        </div>
      </div>

      <AlertDialog
        open={pendingItems !== null}
        onOpenChange={(open) => !open && setPendingItems(null)}
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
