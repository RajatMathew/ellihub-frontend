import { Plus, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import {
  getSubChangeOrderShippingHandlingFee,
  getSubChangeOrderNegotiatedDiscount,
  getSubChangeOrderSubtotal,
  getSubChangeOrderTaxAmount,
  getSubChangeOrderTotalAmount,
} from '@/modules/project/components/sub-change-order';
import type { SCOListItem } from '@/modules/project/schemas/sub-change-order';

interface PurchaseOrderDetailLinkedSCOsCardProps {
  projectId: string;
  scos: SCOListItem[];
  isLoading: boolean;
  approvedTotal: number;
  canCreate?: boolean;
  createTo?: string;
}

export function PurchaseOrderDetailLinkedSCOsCard({
  projectId,
  scos,
  isLoading,
  approvedTotal,
  canCreate = false,
  createTo,
}: PurchaseOrderDetailLinkedSCOsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Sub Change Orders ({scos.length})
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {approvedTotal > 0 && (
            <span className="text-xs font-semibold text-muted-foreground">
              Approved {formatCurrency(approvedTotal)}
            </span>
          )}
          {canCreate && createTo && (
            <Button variant="outline" size="sm" asChild>
              <Link to={createTo}>
                <Plus className="size-4" />
                Add SCO
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ProjectInlineListLoading rows={2} rowClassName="h-20" />
        ) : scos.length > 0 ? (
          <div className="space-y-2">
            {scos.map((sco) => {
              const shippingHandlingFee = getSubChangeOrderShippingHandlingFee(sco);
              const negotiatedDiscount = getSubChangeOrderNegotiatedDiscount(sco);
              const taxAmount = getSubChangeOrderTaxAmount(sco);

              return (
                <Link
                  key={sco.id}
                  to={`/app/project/${projectId}/sub-change-order/${sco.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {sco.scoNumber ?? sco.title ?? 'Sub Change Order'}
                        </span>
                        <Badge
                          variant={sco.status === 'APPROVED' ? 'success' : 'primary'}
                          appearance="light"
                          size="sm"
                        >
                          {sco.status}
                        </Badge>
                      </div>
                      {sco.title && (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {sco.title}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{sco.date ? formatDate(sco.date) : '-'}</span>
                        {sco.changeType && (
                          <span>
                            {'label' in sco.changeType && sco.changeType.label
                              ? sco.changeType.label
                              : 'Change Type'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <div className="font-semibold tabular-nums">
                        {formatCurrency(getSubChangeOrderTotalAmount(sco))}
                      </div>
                      {(negotiatedDiscount !== 0 || shippingHandlingFee !== 0 || taxAmount !== 0) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Subtotal {formatCurrency(getSubChangeOrderSubtotal(sco))}
                          {negotiatedDiscount !== 0 &&
                            ` - Discount ${formatCurrency(negotiatedDiscount)}`}
                          {shippingHandlingFee !== 0 &&
                            ` + Shipping and Handling Fee ${formatCurrency(shippingHandlingFee)}`}
                          {taxAmount !== 0 && ` + Tax ${formatCurrency(taxAmount)}`}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Link2 className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No sub change orders linked to this purchase order.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
