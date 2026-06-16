import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { SCO_STATUS_BADGE_VARIANTS } from '@/modules/project/constants/sub-change-order';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import type { SCOListItem } from '@/modules/project/schemas/sub-change-order';
import { MoreHorizontal } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import {
  formatOptionalSubChangeOrderCurrency,
  formatOptionalSubChangeOrderDate,
  getSubChangeOrderNegotiatedDiscount,
  getSubChangeOrderShippingHandlingFee,
  getSubChangeOrderSubtotal,
  getSubChangeOrderTaxAmount,
  getSubChangeOrderTaxLabel,
  getSubChangeOrderTotalAmount,
  getSubChangeOrderPurchaseOrderLabel,
  getSubChangeOrderTypeLabel,
} from './sub-change-order-list-utils';

export function SubChangeOrderNumberCell({ sco }: { sco: SCOListItem }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link to={`${sco.id}`} className="text-sm font-semibold text-foreground hover:text-primary">
        {sco.scoNumber ?? '-'}
      </Link>
      <span className="line-clamp-1 text-2sm text-muted-foreground">
        {sco.title ?? sco.description ?? '-'}
      </span>
    </div>
  );
}

export function SubChangeOrderPurchaseOrderCell({
  sco,
  projectId,
}: {
  sco: SCOListItem;
  projectId: string;
}) {
  const purchaseOrderLabel = getSubChangeOrderPurchaseOrderLabel(sco);

  return (
    <div className="flex flex-col gap-0.5">
      {sco.purchaseOrder?.id ? (
        <Link
          to={`/app/project/${projectId}/purchase-orders/${sco.purchaseOrder.id}`}
          className="text-sm font-medium text-foreground hover:text-primary"
        >
          {purchaseOrderLabel}
        </Link>
      ) : (
        <span className="text-sm text-foreground">{purchaseOrderLabel}</span>
      )}
      {sco.purchaseOrder?.status && (
        <span className="text-2sm text-muted-foreground">PO {sco.purchaseOrder.status}</span>
      )}
    </div>
  );
}

export function SubChangeOrderTypeCell({ sco, fallback }: { sco: SCOListItem; fallback?: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="primary" appearance="outline" size="sm">
        {getSubChangeOrderTypeLabel(sco, fallback)}
      </Badge>
    </div>
  );
}

export function SubChangeOrderAmountCell({ sco }: { sco: SCOListItem }) {
  const subtotal = getSubChangeOrderSubtotal(sco);
  const negotiatedDiscount = getSubChangeOrderNegotiatedDiscount(sco);
  const shippingHandlingFee = getSubChangeOrderShippingHandlingFee(sco);
  const taxAmount = getSubChangeOrderTaxAmount(sco);
  const total = getSubChangeOrderTotalAmount(sco);

  return (
    <div className="flex flex-col gap-0.5 text-right">
      <span className="text-sm font-medium text-foreground">
        {formatOptionalSubChangeOrderCurrency(total)}
      </span>
      {(negotiatedDiscount !== 0 || shippingHandlingFee !== 0 || taxAmount !== 0) && (
        <>
          <span className="text-2sm text-muted-foreground">
            Subtotal {formatOptionalSubChangeOrderCurrency(subtotal)}
          </span>
          {negotiatedDiscount !== 0 && (
            <span className="text-2sm text-muted-foreground">
              Discount -{formatOptionalSubChangeOrderCurrency(negotiatedDiscount)}
            </span>
          )}
          {shippingHandlingFee !== 0 && (
            <span className="text-2sm text-muted-foreground">
              Shipping and Handling Fee {formatOptionalSubChangeOrderCurrency(shippingHandlingFee)}
            </span>
          )}
          {taxAmount !== 0 && (
            <span className="text-2sm text-muted-foreground">
              {getSubChangeOrderTaxLabel(sco)} {formatOptionalSubChangeOrderCurrency(taxAmount)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function SubChangeOrderStatusCell({ sco }: { sco: SCOListItem }) {
  return (
    <Badge
      variant={SCO_STATUS_BADGE_VARIANTS[sco.status] ?? 'primary'}
      appearance="outline"
      size="sm"
    >
      {sco.status}
    </Badge>
  );
}

export function SubChangeOrderDateCell({ sco }: { sco: SCOListItem }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-foreground">{formatOptionalSubChangeOrderDate(sco.date)}</span>
    </div>
  );
}

export function SubChangeOrderCreatedAtCell({ sco }: { sco: SCOListItem }) {
  return (
    <span className="text-sm text-foreground">
      {formatOptionalSubChangeOrderDate(sco.createdAt)}
    </span>
  );
}

export function SubChangeOrderActionsCell({ sco }: { sco: SCOListItem }) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const canEdit =
    project?.capabilities?.actions?.subChangeOrder?.update === true && sco.status === 'DRAFT';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          mode="icon"
          size="sm"
          className="size-7"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link to={`${sco.id}`}>View</Link>
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem asChild>
            <Link to={`${sco.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
