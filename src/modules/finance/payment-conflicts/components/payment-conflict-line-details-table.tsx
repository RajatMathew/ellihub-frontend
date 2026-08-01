import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { cn } from '@/app/lib/utils';
import type {
  LineTableColumn,
  LineTableRow,
} from '@/modules/finance/payment-conflicts/components/payment-conflict-line-details-table.constants';
import { CheckCircle2, Minus } from 'lucide-react';

export function ConflictLineDetailsTable({
  ariaLabel,
  columns,
  rows,
  isSuperseded,
  minWidthClassName,
}: {
  ariaLabel: string;
  columns: LineTableColumn[];
  rows: LineTableRow[];
  isSuperseded: boolean;
  minWidthClassName: string;
}) {
  return (
    <section aria-label={ariaLabel}>
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <Table className={minWidthClassName}>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.label}
                  className={cn('h-9 px-3 text-xs', column.headClassName)}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.key}
                className={cn(
                  isSuperseded &&
                    'text-muted-foreground [&_td]:line-through [&_td]:decoration-border'
                )}
              >
                {row.cells.map((cell, index) => (
                  <TableCell
                    key={columns[index]?.label ?? index}
                    className={cn('px-3 py-2.5 text-xs', columns[index]?.cellClassName)}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function TruncatedLineValue({ value }: { value: string | null }) {
  return (
    <span className="block truncate" title={value ?? undefined}>
      {value ?? 'Not set'}
    </span>
  );
}

export function BillableStatus({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Minus className="size-3.5" aria-hidden="true" />
        <span>Not set</span>
      </span>
    );
  }

  const isBillable = status.toLowerCase() === 'billable';
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckCircle2
        className={cn('size-3.5', isBillable ? 'text-success' : 'text-muted-foreground')}
        aria-hidden="true"
      />
      <span>{isBillable ? 'Yes' : 'No'}</span>
    </span>
  );
}
