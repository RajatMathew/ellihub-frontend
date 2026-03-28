import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { formatCurrency } from '@app/lib/helpers';

import type { PCOListItem } from '@modules/project/schemas/pco.schema';

interface PrimeChangeOrdersCardProps {
  projectId: string;
  pcos: PCOListItem[];
  isLoading?: boolean;
}

export function PrimeChangeOrdersCard({
  projectId,
  pcos,
  isLoading = false,
}: PrimeChangeOrdersCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Prime Change Orders
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" asChild>
          <Link to={`/app/project/${projectId}/change-orders`}>
            View All <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : pcos.length > 0 ? (
          <div className="space-y-3">
            {pcos.map((pco) => (
              <div
                key={pco.id}
                className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {pco.pcoNumber ?? '—'}
                    </span>
                    {pco.status && (
                      <Badge
                        style={{
                          backgroundColor: pco.status.color,
                          color: '#fff',
                        }}
                        size="xs"
                        className="shrink-0"
                      >
                        {pco.status.label}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {formatCurrency(pco.amount)}
                  </span>
                </div>
                <div className="text-sm font-medium leading-snug">
                  {pco.title}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ArrowRight className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No prime change orders yet.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/project/${projectId}/change-orders/new`}>
                Create PCO
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
