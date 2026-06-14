import { TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';

interface MonthlyBillsTableHeaderProps {
  monthName: string;
  canMarkPayment: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
}

export function MonthlyBillsTableHeader({
  monthName,
  canMarkPayment,
  visibleColumns,
}: MonthlyBillsTableHeaderProps) {
  const show = (key: MonthlyBillColumnKey) => visibleColumns.has(key);

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {/* Chevron expand/collapse column */}
        <TableHead className="h-10 w-12 text-xs font-semibold uppercase tracking-normal" />
        {show('poNumber') && (
          <TableHead className="h-10 min-w-44 text-xs font-semibold uppercase tracking-normal">
            PO #
          </TableHead>
        )}
        {show('issueDate') && (
          <TableHead className="h-10 min-w-28 text-xs font-semibold uppercase tracking-normal">
            PO Issue Date
          </TableHead>
        )}
        {show('vendor') && (
          <TableHead className="h-10 min-w-32 text-xs font-semibold uppercase tracking-normal">
            Vendor
          </TableHead>
        )}
        {show('payments') && (
          <TableHead className="h-10 min-w-40 text-xs font-semibold uppercase tracking-normal">
            Payments in {monthName}
          </TableHead>
        )}
        {show('paidThisMonth') && (
          <TableHead className="h-10 min-w-28 text-right text-xs font-semibold uppercase tracking-normal">
            Paid This Month
          </TableHead>
        )}
        {show('original') && (
          <TableHead className="h-10 min-w-28 text-right text-xs font-semibold uppercase tracking-normal">
            Original
          </TableHead>
        )}
        {show('totalPaid') && (
          <TableHead className="h-10 min-w-28 text-right text-xs font-semibold uppercase tracking-normal">
            Total Paid
          </TableHead>
        )}
        {show('balance') && (
          <TableHead className="h-10 min-w-28 text-right text-xs font-semibold uppercase tracking-normal">
            Balance
          </TableHead>
        )}
        {show('toPay') && (
          <TableHead className="h-10 min-w-28 text-right text-xs font-semibold uppercase tracking-normal">
            To Pay
          </TableHead>
        )}
        {show('ready') && (
          <TableHead className="h-10 w-20 text-center text-xs font-semibold uppercase tracking-normal">
            Ready
          </TableHead>
        )}
        {canMarkPayment && (
          <TableHead className="h-10 min-w-40 text-center text-xs font-semibold uppercase tracking-normal" />
        )}
      </TableRow>
    </TableHeader>
  );
}
