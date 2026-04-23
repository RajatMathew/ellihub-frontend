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

import { getStatusBadgeVariant } from '@modules/project/constants/pco.constants';
import type { PCOListItem } from '@modules/project/schemas/pco.schema';

interface ChangeOrdersCardProps {
  pcos: PCOListItem[];
  originalContractValue: number;
  isLoading: boolean;
}

export function ChangeOrdersCard({
  pcos,
  originalContractValue,
  isLoading,
}: ChangeOrdersCardProps) {
  const enrichedPcos = pcos.map((pco) => {
    const statusName = pco.status?.name ?? pco.status?.label;
    const isApproved =
      (statusName?.toLowerCase().includes('approved') ?? false) ||
      (statusName?.toLowerCase().includes('executed') ?? false);
    return {
      pco,
      statusName,
      isApproved,
    };
  });

  const cumulativePcos = enrichedPcos.reduce<
    Array<{
      pco: (typeof enrichedPcos)[number]['pco'];
      statusName: (typeof enrichedPcos)[number]['statusName'];
      isApproved: boolean;
      revisedCV?: number;
    }>
  >((acc, item) => {
    const runningTotal = acc.length > 0 ? (acc[acc.length - 1].revisedCV ?? originalContractValue) : originalContractValue;
    const nextValue = item.isApproved ? runningTotal + item.pco.amount : runningTotal;

    acc.push({
      ...item,
      revisedCV: nextValue,
    });
    return acc;
  }, []);

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
              {cumulativePcos.map(({ pco, statusName, isApproved, revisedCV }) => {
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
                      {isApproved ? formatCurrency(revisedCV ?? originalContractValue) : '—'}
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
