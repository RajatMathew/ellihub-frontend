import { TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';
import type { ReactNode } from 'react';

interface MonthlyBillsTableHeaderProps {
  monthName: string;
  canMarkPayment: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
  /** Select-all checkbox for the live table; omitted in the skeleton. */
  selectAllSlot?: ReactNode;
}

export function MonthlyBillsTableHeader({
  monthName,
  canMarkPayment,
  visibleColumns,
  selectAllSlot,
}: MonthlyBillsTableHeaderProps) {
  const show = (key: MonthlyBillColumnKey) => visibleColumns.has(key);

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="h-10 w-12">{selectAllSlot}</TableHead>
        {show('poNumber') && <TableHead className="h-10 min-w-44">PO #</TableHead>}
        {show('issueDate') && <TableHead className="h-10 min-w-28">PO Issue Date</TableHead>}
        {show('vendor') && <TableHead className="h-10 min-w-32">Vendor</TableHead>}
        {show('payments') && (
          <TableHead className="h-10 min-w-40">Payments in {monthName}</TableHead>
        )}
        {show('paidThisMonth') && (
          <TableHead className="h-10 min-w-28 text-right">Paid This Month</TableHead>
        )}
        {show('original') && <TableHead className="h-10 min-w-28 text-right">Original</TableHead>}
        {show('totalPaid') && (
          <TableHead className="h-10 min-w-28 text-right">Total Paid</TableHead>
        )}
        {show('balance') && <TableHead className="h-10 min-w-28 text-right">Balance</TableHead>}
        {show('toPay') && <TableHead className="h-10 min-w-28 text-right">To Pay</TableHead>}
        {show('ready') && <TableHead className="h-10 w-20 text-center">Ready</TableHead>}
        {canMarkPayment && <TableHead className="h-10 min-w-40 text-center" />}
      </TableRow>
    </TableHeader>
  );
}
