import { Badge } from '@/app/components/ui/badge';
import { ListingIdentifierLink } from '@/app/components/ui/listing-identifier';
import {
  PO_STATUS_BADGE_VARIANTS,
  PO_STATUS_LABELS,
} from '@/modules/project/constants/purchase-order';
import type { POListItem } from '@/modules/project/schemas/purchase-order';

import { getSubChangeOrderTotalAmount } from '../sub-change-order/sub-change-order-list-utils';
import {
  PurchaseOrderActionsCell,
  PurchaseOrderTradeCategoryCell,
} from './purchase-order-list-column-cells';
import {
  formatOptionalPurchaseOrderCurrency,
  formatOptionalPurchaseOrderDate,
  formatPurchaseOrderPaymentTerms,
  getPurchaseOrderRfqLabel,
  getPurchaseOrderVendorName,
} from './purchase-order-list-utils';
import { calculateEffectivePurchaseOrderTotals } from './purchase-order-totals';

export function PurchaseOrderMobileCard({
  po,
  onCancel,
}: {
  po: POListItem;
  onCancel: (po: POListItem) => void;
}) {
  const purchaseOrderTotals = calculateEffectivePurchaseOrderTotals({
    subtotal: po.subtotal,
    negotiatedDiscount: po.negotiatedDiscount,
    shippingHandlingFee: po.shippingHandlingFee,
    taxPercent: po.taxPercent,
    taxAmount: po.taxAmount,
  });
  const approvedScoTotal = (po.subChangeOrders ?? [])
    .filter((sco) => sco.status === 'APPROVED')
    .reduce((sum, sco) => sum + getSubChangeOrderTotalAmount(sco), 0);
  const totalCommitment = purchaseOrderTotals.total + approvedScoTotal;
  const rfqLabel = getPurchaseOrderRfqLabel(po);

  return (
    <div className="min-w-0 max-w-full rounded-md border bg-background p-3 shadow-xs shadow-black/5">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <ListingIdentifierLink
            to={`${po.id}`}
            value={po.poNumber}
            className="block max-w-full truncate text-sm"
          />
          <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
            {po.description ?? '-'}
          </p>
        </div>
        <PurchaseOrderActionsCell po={po} onCancel={onCancel} />
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge
          variant={PO_STATUS_BADGE_VARIANTS[po.status] ?? 'primary'}
          appearance="outline"
          size="sm"
        >
          {PO_STATUS_LABELS[po.status] ?? po.status}
        </Badge>
        <PurchaseOrderTradeCategoryCell po={po} />
        {rfqLabel && po.rfqId && (
          <ListingIdentifierLink
            to={`/app/project/${po.projectId}/rfqs/${po.rfqId}`}
            value={`RFQ ${rfqLabel}`}
            className="inline-flex max-w-full items-center rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-xs"
            title={rfqLabel}
          />
        )}
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 text-xs">
        <PurchaseOrderMobileMetric label="Vendor" value={getPurchaseOrderVendorName(po)} />
        <PurchaseOrderMobileMetric
          label="Amount"
          value={formatOptionalPurchaseOrderCurrency(totalCommitment)}
          note={
            approvedScoTotal > 0
              ? `SCO +${formatOptionalPurchaseOrderCurrency(approvedScoTotal)}`
              : undefined
          }
        />
        <PurchaseOrderMobileMetric
          label="Expected"
          value={formatOptionalPurchaseOrderDate(po.expectedDate)}
        />
        <PurchaseOrderMobileMetric
          label="Delivered"
          value={formatOptionalPurchaseOrderDate(po.deliveryDate)}
        />
        <PurchaseOrderMobileMetric
          label="Created"
          value={formatOptionalPurchaseOrderDate(po.createdAt)}
        />
        <PurchaseOrderMobileMetric
          label="Terms"
          value={formatPurchaseOrderPaymentTerms(po.paymentTerms)}
        />
      </div>
    </div>
  );
}

function PurchaseOrderMobileMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium tabular-nums text-foreground" title={value}>
        {value}
      </p>
      {note && <p className="mt-0.5 truncate text-muted-foreground">{note}</p>}
    </div>
  );
}
