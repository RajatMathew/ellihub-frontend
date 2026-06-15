import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { formatCurrency } from '@/app/lib/helpers';
import { sumMonthlyBillMoney } from '@/modules/monthly-bills/lib/monthly-bills-money';
import type { MonthlyBillSubChangeOrder } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SubChangeOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subChangeOrders: MonthlyBillSubChangeOrder[];
  poNumber: string;
  projectId: string;
}

export function SubChangeOrdersDialog({
  open,
  onOpenChange,
  subChangeOrders,
  poNumber,
  projectId,
}: SubChangeOrdersDialogProps) {
  const total = sumMonthlyBillMoney(subChangeOrders.map((sco) => sco.amount));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sub Change Orders</DialogTitle>
          <DialogDescription>
            {subChangeOrders.length} change order{subChangeOrders.length === 1 ? '' : 's'} linked to{' '}
            {poNumber}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <ul className="divide-y divide-border rounded-md border border-border">
            {subChangeOrders.map((sco) => (
              <li
                key={sco.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  to={`/app/project/${projectId}/sub-change-order/${sco.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                >
                  {sco.scoNumber}
                  <ExternalLink className="size-3.5" />
                </Link>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(sco.amount)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-3 px-1 text-sm font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
