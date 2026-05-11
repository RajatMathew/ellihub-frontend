import { RefreshCcw } from 'lucide-react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import type {
  QuickBooksTransaction,
  QuickBooksTransactions,
} from '@/modules/integrations/schemas/quickbooks.schema';

type QuickBooksTransactionsCardProps = {
  isConnected: boolean;
  transactions?: QuickBooksTransactions;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
};

const formatDate = (value: string | null): string => {
  if (!value) return '-';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '-';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatAmount = (transaction: QuickBooksTransaction): string => {
  if (transaction.totalAmount === null) return '-';

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: transaction.currency ?? 'USD',
  }).format(transaction.totalAmount);
};

function TransactionsSkeleton() {
  return (
    <CardContent className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </CardContent>
  );
}

function EmptyTransactions({ isConnected }: { isConnected: boolean }) {
  return (
    <CardContent>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm font-medium">
          {isConnected ? 'No transactions returned' : 'Connect QuickBooks first'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isConnected ? 'Recent transactions will appear here after sync.' : 'A company connection is required.'}
        </p>
      </div>
    </CardContent>
  );
}

export function QuickBooksTransactionsCard({
  isConnected,
  transactions,
  isLoading,
  isFetching,
  isError,
  onRetry,
}: QuickBooksTransactionsCardProps) {
  const rows = transactions?.transactions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeading>
        <CardToolbar>
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={!isConnected || isFetching}
          >
            <RefreshCcw className="size-3.5" />
            Refresh
          </Button>
        </CardToolbar>
      </CardHeader>

      {!isConnected ? (
        <EmptyTransactions isConnected={false} />
      ) : isLoading ? (
        <TransactionsSkeleton />
      ) : isError ? (
        <CardContent>
          <QueryErrorState title="Unable to load QuickBooks transactions" onRetry={onRetry} />
        </CardContent>
      ) : rows.length === 0 ? (
        <EmptyTransactions isConnected />
      ) : (
        <CardTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Doc #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((transaction, index) => (
                <TableRow key={`${transaction.entity}-${transaction.id}-${index}`}>
                  <TableCell>
                    <Badge variant="info" appearance="light">
                      {transaction.entity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{transaction.displayName}</TableCell>
                  <TableCell>{transaction.docNumber ?? '-'}</TableCell>
                  <TableCell>{formatDate(transaction.txnDate)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(transaction)}
                  </TableCell>
                  <TableCell>{formatDateTime(transaction.lastUpdatedTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardTable>
      )}
    </Card>
  );
}
