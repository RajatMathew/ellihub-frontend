import { useEffect, useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import {
  useAddPOQuickBooksPaymentsMutation,
  usePOQuickBooksPaymentOptionsQuery,
} from '@/modules/project/hooks/purchase-order';
import type { POQuickBooksPaymentOption } from '@/modules/project/schemas/purchase-order';
import { RefreshCcw } from 'lucide-react';

type PurchaseOrderAddQuickBooksPaymentDialogProps = {
  purchaseOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const getOptionKey = (transaction: POQuickBooksPaymentOption) =>
  `${transaction.entity}:${transaction.id}`;

function formatPaymentAmount(transaction: POQuickBooksPaymentOption) {
  if (transaction.totalAmount === null) return '-';
  return formatCurrency(transaction.totalAmount);
}

function TransactionOptionRow({
  transaction,
  checked,
  onCheckedChange,
}: {
  transaction: POQuickBooksPaymentOption;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const linkedPO = transaction.linkedPurchaseOrder;
  const disabled = !!linkedPO;

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onCheckedChange(!checked);
      }}
      onKeyDown={(event) => {
        if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onCheckedChange(!checked);
      }}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
        checked && 'border-primary bg-primary/5',
        disabled && 'cursor-not-allowed bg-muted/30 opacity-70',
        !disabled && 'hover:bg-muted/40'
      )}
    >
      <span onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-0.5"
          aria-label={`Select ${transaction.entity} ${transaction.docNumber ?? transaction.id}`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="info" appearance="light" size="sm">
            {transaction.entity}
          </Badge>
          <span className="truncate text-sm font-medium">
            {transaction.displayName || transaction.docNumber || transaction.id}
          </span>
          {linkedPO && (
            <Badge variant="warning" appearance="light" size="sm">
              Linked to {linkedPO.poNumber ?? 'PO'}
            </Badge>
          )}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Doc: {transaction.docNumber ?? '-'}</span>
          <span>{transaction.txnDate ? formatDate(transaction.txnDate) : '-'}</span>
          {transaction.privateNote && <span className="truncate">{transaction.privateNote}</span>}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
        {formatPaymentAmount(transaction)}
      </span>
    </div>
  );
}

export function PurchaseOrderAddQuickBooksPaymentDialog({
  purchaseOrderId,
  open,
  onOpenChange,
}: PurchaseOrderAddQuickBooksPaymentDialogProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const optionsQuery = usePOQuickBooksPaymentOptionsQuery(purchaseOrderId, open);
  const addPayments = useAddPOQuickBooksPaymentsMutation();
  const refetchPaymentOptions = optionsQuery.refetch;

  useEffect(() => {
    if (open) void refetchPaymentOptions();
  }, [open, refetchPaymentOptions]);

  const transactions = useMemo(
    () => optionsQuery.data?.transactions ?? [],
    [optionsQuery.data?.transactions]
  );
  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const availableTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.linkedPurchaseOrder),
    [transactions]
  );
  const selectedTransactions = useMemo(
    () =>
      availableTransactions.filter((transaction) => selectedKeySet.has(getOptionKey(transaction))),
    [availableTransactions, selectedKeySet]
  );
  const selectedTotal = selectedTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.totalAmount ?? 0),
    0
  );
  const allAvailableSelected =
    availableTransactions.length > 0 &&
    availableTransactions.every((transaction) => selectedKeySet.has(getOptionKey(transaction)));

  const toggleTransaction = (transaction: POQuickBooksPaymentOption, checked: boolean) => {
    const key = getOptionKey(transaction);
    setSelectedKeys((current) => {
      if (checked) return current.includes(key) ? current : [...current, key];
      return current.filter((selectedKey) => selectedKey !== key);
    });
  };

  const toggleAllAvailable = () => {
    setSelectedKeys(allAvailableSelected ? [] : availableTransactions.map(getOptionKey));
  };

  const handleSubmit = () => {
    if (selectedTransactions.length === 0) return;

    addPayments.mutate(
      {
        poId: purchaseOrderId,
        data: {
          payments: selectedTransactions.map((transaction) => ({
            entity: transaction.entity,
            transactionId: transaction.id,
            realmId: transaction.realmId,
          })),
        },
      },
      {
        onSuccess: () => handleOpenChange(false),
      }
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSelectedKeys([]);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-screen sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add QuickBooks Payment</DialogTitle>
        </DialogHeader>
        <DialogBody className="min-h-0 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {optionsQuery.data?.companyName ?? 'QuickBooks Online'}
              </div>
              {optionsQuery.data?.fetchedAt && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Synced {formatDate(optionsQuery.data.fetchedAt)}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void optionsQuery.refetch()}
              disabled={optionsQuery.isFetching}
            >
              <RefreshCcw className="size-3.5" />
              Refresh
            </Button>
          </div>

          {optionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : optionsQuery.isError ? (
            <QueryErrorState
              title="Unable to load QuickBooks transactions"
              onRetry={() => void optionsQuery.refetch()}
            />
          ) : transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <p className="text-sm font-medium">No QuickBooks payments found.</p>
            </div>
          ) : (
            <div className="min-h-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllAvailable}
                  disabled={availableTransactions.length === 0}
                >
                  {allAvailableSelected ? 'Clear' : 'Select all'}
                </Button>
                {selectedTransactions.length > 0 && (
                  <div className="text-xs font-medium text-muted-foreground">
                    {selectedTransactions.length} selected - {formatCurrency(selectedTotal)}
                  </div>
                )}
              </div>
              <ScrollArea className="h-96 pr-3">
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <TransactionOptionRow
                      key={getOptionKey(transaction)}
                      transaction={transaction}
                      checked={selectedKeySet.has(getOptionKey(transaction))}
                      onCheckedChange={(checked) => toggleTransaction(transaction, checked)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedTransactions.length === 0 || addPayments.isPending}
            onClick={handleSubmit}
          >
            {addPayments.isPending
              ? 'Adding...'
              : selectedTransactions.length <= 1
                ? 'Add payment'
                : `Add ${selectedTransactions.length} payments`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
