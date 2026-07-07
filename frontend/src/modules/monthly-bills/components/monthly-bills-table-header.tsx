import { TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';

interface MonthlyBillsTableHeaderProps {
  monthName: string;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
}

export function MonthlyBillsTableHeader({
  monthName,
  canMarkPayment,
  visibleColumns,
}: MonthlyBillsTableHeaderProps) {
  const show = (key: MonthlyBillColumnKey) => visibleColumns.has(key);
  const showVendorInfo = show('vendor') || show('issueDate');
  const showPaymentInfo = show('payments') || show('paidThisMonth');
  const hasActions = canMarkPayment;

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {/* Chevron expand/collapse column */}
        <TableHead className="h-10 w-12 text-xs font-semibold uppercase tracking-normal" />
        {show('poNumber') && (
          <TableHead className="h-10 min-w-36 text-xs font-semibold uppercase tracking-normal">
            PO #
          </TableHead>
        )}
        {showVendorInfo && (
          <TableHead className="h-10 min-w-64 text-xs font-semibold uppercase tracking-normal">
            {show('vendor') ? 'Vendor' : 'PO Issue Date'}
          </TableHead>
        )}
        {showPaymentInfo && (
          <TableHead className="h-10 min-w-40 text-xs font-semibold uppercase tracking-normal">
            {show('payments') ? `Payments in ${monthName}` : 'Paid This Month'}
          </TableHead>
        )}
        {show('original') && (
          <TableHead className="h-10 min-w-28 text-xs font-semibold uppercase tracking-normal">
            Original
          </TableHead>
        )}
        {show('totalPaid') && (
          <TableHead className="h-10 min-w-28 text-xs font-semibold uppercase tracking-normal">
            Total Paid
          </TableHead>
        )}
        {show('balance') && (
          <TableHead className="h-10 min-w-28 text-xs font-semibold uppercase tracking-normal">
            Balance
          </TableHead>
        )}
        {show('toPay') && (
          <TableHead className="h-10 min-w-36 text-left text-xs font-semibold uppercase tracking-normal">
            Planned payment
          </TableHead>
        )}
        {show('ready') && (
          <TableHead className="h-10 w-20 text-center text-xs font-semibold uppercase tracking-normal">
            Ready
          </TableHead>
        )}
        {hasActions && (
          <TableHead className="h-10 min-w-36 text-center text-xs font-semibold uppercase tracking-normal" />
        )}
      </TableRow>
    </TableHeader>
  );
}
