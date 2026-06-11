import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { formatCurrency } from '@/app/lib/helpers';
import {
  useQuickBooksBankAccountsQuery,
  useQuickBooksCategoriesQuery,
  useQuickBooksVendorsQuery,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import type { QuickBooksPayee } from '@/modules/integrations/schemas/quickbooks.schema';
import { useMarkPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { format } from 'date-fns';
import { CheckCircle2, CreditCard } from 'lucide-react';

interface MarkPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: MonthlyBillItem;
  amount: number;
  month: number;
  year: number;
}

/** Suggest the QuickBooks vendor that most likely maps to this ElliHub vendor. */
function findVendorMatch(vendors: QuickBooksPayee[], vendorName: string) {
  const target = vendorName.trim().toLowerCase();
  if (!target) return null;

  const exact = vendors.find((vendor) => vendor.displayName.trim().toLowerCase() === target);
  if (exact) return { vendor: exact, reason: 'Names match exactly.' };

  const overlapping = vendors.find((vendor) => {
    const name = vendor.displayName.trim().toLowerCase();
    return name.includes(target) || target.includes(name);
  });
  if (overlapping) return { vendor: overlapping, reason: 'One vendor name contains the other.' };

  return null;
}

export function MarkPaymentDialog({
  open,
  onOpenChange,
  bill,
  amount,
  month,
  year,
}: MarkPaymentDialogProps) {
  const vendorName = bill.purchaseOrder.vendor.name;
  const poNumber = bill.purchaseOrder.poNumber;

  const bankAccountsQuery = useQuickBooksBankAccountsQuery(open);
  const categoriesQuery = useQuickBooksCategoriesQuery(open);
  const vendorsQuery = useQuickBooksVendorsQuery(open);

  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
  const vendorMatch = useMemo(() => findVendorMatch(vendors, vendorName), [vendors, vendorName]);

  const [bankAccountId, setBankAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  // Empty until the user picks; falls back to the suggested match during render.
  const [vendorOverride, setVendorOverride] = useState('');

  const markPayment = useMarkPaymentMutation();

  // The server stamps the transaction date when posting; shown read-only for context.
  const paymentDate = useMemo(() => format(new Date(), 'MMM d, yyyy'), []);

  // Default the mapping to the suggested QuickBooks vendor without an effect.
  // Values are QuickBooks-native ids (qbId): the mark-payment endpoint resolves references by them.
  const qbVendorId = vendorOverride || vendorMatch?.vendor.qbId || '';

  // The backend only posts a payment for a planned payment that has been marked ready.
  const isReady = bill.plannedPayment?.isReady ?? false;

  const canSave =
    isReady &&
    Boolean(bankAccountId) &&
    Boolean(categoryId) &&
    Boolean(qbVendorId) &&
    amount > 0 &&
    !markPayment.isPending;

  const handleSave = () => {
    markPayment.mutate(
      {
        purchaseOrderId: bill.purchaseOrder.id,
        month,
        year,
        qbVendorId,
        bankAccountId,
        categoryId,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mark Payment</DialogTitle>
          <DialogDescription>
            Create the QuickBooks payment, then mark this bill paid in ElliHub.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-4">
            <SummaryItem label="Amount" value={formatCurrency(amount)} emphasize />
            <SummaryItem label="Payee" value={vendorName} />
            <SummaryItem label="PO" value={poNumber} />
            <SummaryItem label="Balance" value={formatCurrency(bill.balance)} />
          </div>

          {!isReady && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              Mark the bill as <span className="font-semibold">Ready</span> before recording a
              payment.
            </div>
          )}

          {vendorMatch && (
            <div className="space-y-2.5 rounded-lg border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Confirm QuickBooks vendor
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
                ElliHub vendor &ldquo;{vendorName}&rdquo; looks similar to an existing QuickBooks
                vendor. Confirm the mapping before posting so a duplicate vendor is not created.
              </p>
              <Select value={qbVendorId} onValueChange={setVendorOverride}>
                <SelectTrigger className="h-auto bg-background py-2.5">
                  <div className="flex items-center gap-2.5 text-start">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                    <div className="flex flex-col">
                      <SelectValue placeholder="Select the matching QuickBooks vendor" />
                      <span className="text-xs text-muted-foreground">{vendorMatch.reason}</span>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.qbId}>
                      {vendor.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!vendorMatch && (
            <div className="space-y-1.5">
              <Label htmlFor="mark-payment-vendor">QuickBooks Vendor</Label>
              <Select value={qbVendorId} onValueChange={setVendorOverride}>
                <SelectTrigger id="mark-payment-vendor">
                  <SelectValue
                    placeholder={vendorsQuery.isLoading ? 'Loading…' : 'Select QuickBooks vendor'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.qbId}>
                      {vendor.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!vendorsQuery.isLoading && vendors.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No QuickBooks vendors found. Connect QuickBooks and sync reference data first.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mark-payment-bank-account">Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger id="mark-payment-bank-account">
                  <SelectValue
                    placeholder={
                      bankAccountsQuery.isLoading ? 'Loading…' : 'Select bank account'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(bankAccountsQuery.data ?? []).map((account) => (
                    <SelectItem key={account.id} value={account.qbId}>
                      {account.fullyQualifiedName ?? account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mark-payment-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="mark-payment-category">
                  <SelectValue
                    placeholder={categoriesQuery.isLoading ? 'Loading…' : 'Select category'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.qbId}>
                      {category.fullyQualifiedName ?? category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mark-payment-paid-date">Paid Date</Label>
              <Input id="mark-payment-paid-date" value={paymentDate} readOnly disabled />
              <p className="text-xs text-muted-foreground">Stamped automatically when posted.</p>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}>
            <CreditCard className="size-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryItem({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          emphasize
            ? 'text-lg font-semibold text-foreground'
            : 'text-sm font-medium text-foreground'
        }
      >
        {value}
      </p>
    </div>
  );
}
