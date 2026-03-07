import { Badge, BadgeDot } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  Card,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@app/components/ui/table';
import { formatCurrency } from '@app/lib/helpers';

import type { PCOListItem } from '@modules/project/schemas/pco.schema';

interface ChangeOrdersCardProps {
  pcos: PCOListItem[];
  originalContractValue: number;
  isLoading: boolean;
}

function getStatusBadgeVariant(
  statusName: string | undefined,
): 'success' | 'warning' | 'info' | 'destructive' | 'secondary' {
  if (!statusName) return 'secondary';
  const lower = statusName.toLowerCase();
  if (lower.includes('approved') || lower.includes('executed')) return 'success';
  if (lower.includes('pending') || lower.includes('draft')) return 'warning';
  if (lower.includes('sent') || lower.includes('penciled')) return 'info';
  if (lower.includes('rejected') || lower.includes('void')) return 'destructive';
  return 'secondary';
}

export function ChangeOrdersCard({
  pcos,
  originalContractValue,
  isLoading,
}: ChangeOrdersCardProps) {
  let runningCV = originalContractValue;

  return (
    <Card>
      <CardHeader className="bg-foreground text-background rounded-t-xl border-l-4 border-l-success">
        <CardTitle className="text-xs font-bold tracking-widest uppercase text-background">
          Change Orders
        </CardTitle>
        <CardToolbar>
          <Button size="sm" className="bg-success hover:bg-success/90 text-white" disabled>
            + Add CO
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardTable>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : pcos.length === 0 ? (
          <div className="p-5">
            <p className="text-sm text-muted-foreground text-center py-6">
              No change orders found.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CO #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Revised C.V.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pcos.map((pco) => {
                const statusName = pco.status?.name ?? pco.status?.label;
                const isApproved =
                  statusName?.toLowerCase().includes('approved') ||
                  statusName?.toLowerCase().includes('executed');
                if (isApproved) {
                  runningCV += pco.amount;
                }
                return (
                  <TableRow key={pco.id}>
                    <TableCell className="font-medium">
                      {pco.pcoNumber ?? '—'}
                    </TableCell>
                    <TableCell>
                      {pco.status ? (
                        <Badge
                          variant={getStatusBadgeVariant(statusName)}
                          appearance="light"
                          size="sm"
                        >
                          <BadgeDot />
                          {pco.status.label ?? pco.status.name}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(pco.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isApproved ? formatCurrency(runningCV) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardTable>
    </Card>
  );
}
