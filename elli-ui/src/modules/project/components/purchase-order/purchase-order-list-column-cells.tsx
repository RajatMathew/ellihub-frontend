import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  PO_STATUS_BADGE_VARIANTS,
  PO_STATUS_LABELS,
} from '@/modules/project/constants/purchase-order';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import type { POListItem } from '@/modules/project/schemas/purchase-order';
import {
  calculateEffectivePurchaseOrderTotals,
  formatPurchaseOrderTaxLabel,
} from '@/modules/project/components/purchase-order/purchase-order-totals';
import { getSubChangeOrderTotalAmount } from '@/modules/project/components/sub-change-order';
import { MoreHorizontal } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import {
  formatOptionalPurchaseOrderCurrency,
  formatOptionalPurchaseOrderDate,
  formatPurchaseOrderPaymentTerms,
  getPurchaseOrderRfqLabel,
  getPurchaseOrderTradeCategoryLabel,
  getPurchaseOrderVendorName,
} from './purchase-order-list-utils';

export function PurchaseOrderNumberCell({ po }: { po: POListItem }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link to={`${po.id}`} className="text-sm font-semibold text-foreground hover:text-primary">
        {po.poNumber ?? '-'}
      </Link>
      <span className="line-clamp-1 text-2sm text-muted-foreground">{po.description ?? '-'}</span>
    </div>
  );
}

export function PurchaseOrderVendorCell({ po }: { po: POListItem }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="line-clamp-1 text-sm font-medium text-foreground">
        {getPurchaseOrderVendorName(po)}
      </span>
      {po.vendor?.paymentTerms && (
        <span className="text-2sm text-muted-foreground">
          {formatPurchaseOrderPaymentTerms(po.vendor.paymentTerms)}
        </span>
      )}
    </div>
  );
}

export function PurchaseOrderRfqCell({ po, projectId }: { po: POListItem; projectId: string }) {
  const rfqLabel = getPurchaseOrderRfqLabel(po);

  if (!po.rfqId) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <Link
      to={`/app/project/${projectId}/rfqs/${po.rfqId}`}
      className="font-mono text-xs text-foreground hover:text-primary"
      title={rfqLabel ?? po.rfqId}
    >
      {rfqLabel ?? po.rfqId}
    </Link>
  );
}

export function PurchaseOrderTradeCategoryCell({
  po,
  fallback,
}: {
  po: POListItem;
  fallback?: string;
}) {
  if (!po.tradeCategory && !po.tradeCategoryId) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <Badge variant="primary" appearance="outline" size="sm">
      {getPurchaseOrderTradeCategoryLabel(po, fallback)}
    </Badge>
  );
}

export function PurchaseOrderStatusCell({ po }: { po: POListItem }) {
  return (
    <Badge
      variant={PO_STATUS_BADGE_VARIANTS[po.status] ?? 'primary'}
      appearance="outline"
      size="sm"
    >
      {PO_STATUS_LABELS[po.status] ?? po.status}
    </Badge>
  );
}

export function PurchaseOrderAmountCell({ po }: { po: POListItem }) {
  const purchaseOrderTotals = calculateEffectivePurchaseOrderTotals({
    subtotal: po.subtotal,
    negotiatedDiscount: po.negotiatedDiscount,
    shippingHandlingFee: po.shippingHandlingFee,
    taxPercent: po.taxPercent,
    taxAmount: po.taxAmount,
  });
  const poTotal = purchaseOrderTotals.total;
  const approvedScoTotal = (po.subChangeOrders ?? [])
    .filter((sco) => sco.status === 'APPROVED')
    .reduce((sum, sco) => sum + getSubChangeOrderTotalAmount(sco), 0);
  const totalCommitment = poTotal + approvedScoTotal;

  return (
    <div className="flex flex-col gap-0.5 text-right">
      <span className="text-sm font-medium text-foreground">
        {formatOptionalPurchaseOrderCurrency(totalCommitment)}
      </span>
      {approvedScoTotal > 0 && (
        <span className="text-2sm text-muted-foreground">
          SCO +{formatOptionalPurchaseOrderCurrency(approvedScoTotal)}
        </span>
      )}
      <span className="text-2sm text-muted-foreground">
        Subtotal {formatOptionalPurchaseOrderCurrency(purchaseOrderTotals.subtotal)}
      </span>
      {purchaseOrderTotals.negotiatedDiscount !== 0 && (
        <span className="text-2sm text-muted-foreground">
          Discount -{formatOptionalPurchaseOrderCurrency(purchaseOrderTotals.negotiatedDiscount)}
        </span>
      )}
      {purchaseOrderTotals.shippingHandlingFee !== 0 && (
        <span className="text-2sm text-muted-foreground">
          Shipping {formatOptionalPurchaseOrderCurrency(purchaseOrderTotals.shippingHandlingFee)}
        </span>
      )}
      {purchaseOrderTotals.taxAmount !== 0 && (
        <span className="text-2sm text-muted-foreground">
          {formatPurchaseOrderTaxLabel(po.taxPercent)}{' '}
          {formatOptionalPurchaseOrderCurrency(purchaseOrderTotals.taxAmount)}
        </span>
      )}
      <span className="text-2sm text-muted-foreground">
        {formatPurchaseOrderPaymentTerms(po.paymentTerms)}
      </span>
    </div>
  );
}

export function PurchaseOrderTimelineCell({ po }: { po: POListItem }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-foreground">
        Expected: {formatOptionalPurchaseOrderDate(po.expectedDate)}
      </span>
      <span className="text-2sm text-muted-foreground">
        Delivered: {formatOptionalPurchaseOrderDate(po.deliveryDate)}
      </span>
    </div>
  );
}

export function PurchaseOrderCreatedAtCell({ po }: { po: POListItem }) {
  return (
    <span className="text-sm text-foreground">{formatOptionalPurchaseOrderDate(po.createdAt)}</span>
  );
}

export function PurchaseOrderActionsCell({
  po,
  onCancel,
}: {
  po: POListItem;
  onCancel: (po: POListItem) => void;
}) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const projectActions = project?.capabilities?.actions;
  const canEdit = projectActions?.purchaseOrder?.update === true && po.status === 'DRAFT';
  const canCancel =
    projectActions?.purchaseOrder?.cancel === true &&
    po.status !== 'CANCELLED' &&
    po.status !== 'DELIVERED';

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
          <Link to={`${po.id}`}>View</Link>
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem asChild>
            <Link to={`${po.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
        )}
        {canCancel && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onCancel(po)}
          >
            Cancel
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
