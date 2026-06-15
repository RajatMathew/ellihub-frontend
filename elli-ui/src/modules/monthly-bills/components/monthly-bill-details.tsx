import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { getMonthPayments, sumPayments } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import { sumMonthlyBillMoney } from '@/modules/monthly-bills/lib/monthly-bills-money';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';

interface MonthlyBillDetailsProps {
  bill: MonthlyBillItem;
  selectedDate: Date;
  toPay?: number;
  ready?: boolean;
  className?: string;
}

export function MonthlyBillDetails({
  bill,
  selectedDate,
  toPay,
  ready,
  className,
}: MonthlyBillDetailsProps) {
  const monthPayments = getMonthPayments(bill, selectedDate);
  const paidThisMonth = sumPayments(monthPayments);
  const changeOrderTotal = sumMonthlyBillMoney(
    bill.purchaseOrder.subChangeOrders.map((sco) => sco.amount)
  );
  const plannedAmount = toPay ?? bill.plannedPayment?.amount ?? 0;
  const isReady = ready ?? bill.plannedPayment?.isReady ?? false;

  return (
    <dl className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <DetailItem
        label="Issue Date"
        value={
          bill.purchaseOrder.issuedAt
            ? formatDate(bill.purchaseOrder.issuedAt, {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
              })
            : '-'
        }
      />
      <DetailItem label="Vendor" value={bill.purchaseOrder.vendor.name} />
      <DetailItem label="Original" value={formatCurrency(bill.original)} />
      <DetailItem label="Total Paid" value={formatCurrency(bill.totalPaid)} />
      <DetailItem label="Paid This Month" value={formatCurrency(paidThisMonth)} />
      <DetailItem label="Balance" value={formatCurrency(bill.balance)} />
      <DetailItem label="Planned" value={formatCurrency(plannedAmount)} />
      <DetailItem label="Ready" value={isReady ? 'Yes' : 'No'} />
      <DetailItem
        label="Change Orders"
        value={`${bill.purchaseOrder.subChangeOrders.length} (${formatCurrency(changeOrderTotal)})`}
      />
      <DetailItem
        label="Payments"
        value={`${monthPayments.length} (${formatCurrency(paidThisMonth)})`}
      />
    </dl>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
