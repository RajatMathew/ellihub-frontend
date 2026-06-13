import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import type { PrimeChangeOrder } from '@/modules/project/schemas/prime-change-order';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function getStatusVariant(status: string) {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected' || status === 'Void') return 'destructive';
  if (status === 'Pending Approval' || status === 'Pending Revision' || status === 'Requested') {
    return 'warning';
  }
  return 'secondary';
}

interface PrimeChangeOrdersCardProps {
  projectId: string;
  pcos: PrimeChangeOrder[];
  isLoading?: boolean;
  className?: string;
}

export function PrimeChangeOrdersCard({
  projectId,
  pcos,
  isLoading = false,
  className,
}: PrimeChangeOrdersCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Prime Change Orders
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" asChild>
          <Link to={`/app/project/${projectId}/prime-change-orders`}>
            View All <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ProjectInlineListLoading rows={3} rowClassName="h-20" />
        ) : pcos.length > 0 ? (
          <div className="space-y-3">
            {pcos.map((pco) => (
              <div
                key={pco.id}
                className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="shrink-0 text-xs font-mono text-muted-foreground">
                      {pco.referenceNumber ?? '-'}
                    </span>
                    <Badge
                      variant={getStatusVariant(pco.statusName)}
                      appearance="light"
                      size="xs"
                      className="shrink-0"
                    >
                      {pco.statusName}
                    </Badge>
                  </div>
                  <span className="ml-auto shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">
                    {pco.totalCost == null ? '-' : formatCurrency(pco.totalCost)}
                  </span>
                </div>
                <div className="text-sm font-medium leading-snug">{pco.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ArrowRight className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No prime change orders synced yet.</p>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/project/${projectId}/prime-change-orders`}>Sync Fieldwire</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
