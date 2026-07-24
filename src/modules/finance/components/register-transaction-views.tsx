import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { cn } from '@/app/lib/utils';
import {
  formatRegisterDate,
  formatRegisterMoney,
  getClrBadgeVariant,
  getClrLabel,
  getRegisterAmountClassName,
} from '@/modules/finance/lib/checking-register.utils';
import type {
  QuickBooksRegisterClr,
  QuickBooksRegisterTransaction,
} from '@/modules/integrations/schemas/quickbooks.schema';

interface RegisterTransactionViewsProps {
  transactions: QuickBooksRegisterTransaction[];
  currencyCode: string | null;
}

export function RegisterTransactionViews({
  transactions,
  currencyCode,
}: RegisterTransactionViewsProps) {
  return (
    <>
      <div className="hidden min-w-0 overflow-hidden rounded-lg border border-border lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-32">Date</TableHead>
              <TableHead className="w-40">Type / No.</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-28">CLR</TableHead>
              <TableHead className="w-36 text-right">Amount</TableHead>
              <TableHead className="w-36 text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatRegisterDate(transaction.txnDate)}
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {transaction.transactionType || '-'}
                    </p>
                    {transaction.checkNumber && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        No. {transaction.checkNumber}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-64">
                  <span className="line-clamp-2 text-sm font-medium text-foreground">
                    {transaction.payee || '-'}
                  </span>
                </TableCell>
                <TableCell className="max-w-72">
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {transaction.category || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <ClrBadge value={transaction.clr} />
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-semibold tabular-nums',
                    getRegisterAmountClassName(transaction.amount)
                  )}
                >
                  {formatRegisterMoney(transaction.amount, currencyCode)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-foreground">
                  {formatRegisterMoney(transaction.balance, currencyCode)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 lg:hidden">
        {transactions.map((transaction) => (
          <article key={transaction.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {transaction.payee || transaction.transactionType || '-'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRegisterDate(transaction.txnDate)} · {transaction.transactionType || '-'}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-sm font-semibold tabular-nums',
                  getRegisterAmountClassName(transaction.amount)
                )}
              >
                {formatRegisterMoney(transaction.amount, currencyCode)}
              </span>
            </div>
            <dl className="mt-3 grid gap-2 text-xs text-muted-foreground">
              <MobileField label="Category" value={transaction.category || '-'} />
              <MobileField label="No." value={transaction.checkNumber || '-'} />
              <div className="flex items-center justify-between gap-3">
                <dt>CLR</dt>
                <dd>
                  <ClrBadge value={transaction.clr} />
                </dd>
              </div>
              <MobileField
                label="Balance"
                value={formatRegisterMoney(transaction.balance, currencyCode)}
              />
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

export function RegisterTransactionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mt-3 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <dt className="shrink-0">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-foreground [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function ClrBadge({ value }: { value: QuickBooksRegisterClr | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <Badge variant={getClrBadgeVariant(value)} appearance="light" size="sm">
      {getClrLabel(value)}
    </Badge>
  );
}
