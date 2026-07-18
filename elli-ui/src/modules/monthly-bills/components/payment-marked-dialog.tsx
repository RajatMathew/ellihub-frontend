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
import { MarkPaymentSummary } from '@/modules/monthly-bills/components/mark-payment-summary';
import type { MarkPaymentResult } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { CheckCircle2, ExternalLink } from 'lucide-react';

interface PaymentMarkedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: MarkPaymentResult | null;
  amount: number;
  vendorName: string;
  poNumber: string;
  balance: number;
}

export function PaymentMarkedDialog({
  open,
  onOpenChange,
  payment,
  amount,
  vendorName,
  poNumber,
  balance,
}: PaymentMarkedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Marked</DialogTitle>
          <DialogDescription>
            The QuickBooks payment was created and this bill was marked paid in ElliHub.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <MarkPaymentSummary
            amount={amount}
            vendorName={vendorName}
            poNumber={poNumber}
            balance={balance}
          />

          <div className="rounded-md border border-success/20 bg-success/5 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              <div className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Payment posted successfully.
                  </p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    You can review the transaction in QuickBooks from the link below.
                  </p>
                </div>

                {payment?.transactionUrl ? (
                  <Button variant="outline" asChild>
                    <a href={payment.transactionUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" />
                      Open QuickBooks Transaction
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    <ExternalLink className="size-4" />
                    Open QuickBooks Transaction
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
