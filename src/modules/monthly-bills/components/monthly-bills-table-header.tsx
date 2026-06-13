import { TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import type { ReactNode } from 'react';

interface MonthlyBillsTableHeaderProps {
  monthName: string;
  canMarkPayment: boolean;
  /** Select-all checkbox for the live table; omitted in the skeleton. */
  selectAllSlot?: ReactNode;
}

export function MonthlyBillsTableHeader({
  monthName,
  canMarkPayment,
  selectAllSlot,
}: MonthlyBillsTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="h-10 w-12">{selectAllSlot}</TableHead>
        <TableHead className="h-10 min-w-44">PO #</TableHead>
        <TableHead className="h-10 min-w-28">PO Issue Date</TableHead>
        <TableHead className="h-10 min-w-32">Vendor</TableHead>
        <TableHead className="h-10 min-w-40">Payments in {monthName}</TableHead>
        <TableHead className="h-10 min-w-28 text-right">Paid This Month</TableHead>
        <TableHead className="h-10 min-w-28 text-right">Original</TableHead>
        <TableHead className="h-10 min-w-28 text-right">Total Paid</TableHead>
        <TableHead className="h-10 min-w-28 text-right">Balance</TableHead>
        <TableHead className="h-10 min-w-28 text-right">To Pay</TableHead>
        <TableHead className="h-10 w-20 text-center">Ready</TableHead>
        {canMarkPayment && <TableHead className="h-10 min-w-40 text-center" />}
      </TableRow>
    </TableHeader>
  );
}
