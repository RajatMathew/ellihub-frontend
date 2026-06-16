import { useMemo } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { getSubChangeOrderTotalAmount } from '@/modules/project/components/sub-change-order';
import {
  PO_STATUS_BADGE_VARIANTS,
  PO_STATUS_LABELS,
} from '@/modules/project/constants/purchase-order';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';
import type { POListItem } from '@/modules/project/schemas/purchase-order';
import { ArrowUpRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VendorPurchaseOrdersTabProps {
  vendor: VendorDetail;
}

export function VendorPurchaseOrdersTab({ vendor }: VendorPurchaseOrdersTabProps) {
  const purchaseOrdersQuery = usePOsQuery({
    vendorId: vendor.id,
    page: 1,
    size: 1000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const purchaseOrders = useMemo(
    () => (purchaseOrdersQuery.data?.data ?? []).filter((po) => po.status !== 'CANCELLED'),
    [purchaseOrdersQuery.data?.data]
  );

  if (purchaseOrdersQuery.isLoading) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Loading purchase orders...
      </div>
    );
  }

  if (purchaseOrdersQuery.isError) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Unable to load purchase orders.
      </div>
    );
  }

  if (purchaseOrders.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
        <FileText className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No purchase orders</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Purchase orders issued to this vendor will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {purchaseOrders.map((purchaseOrder) => (
        <PurchaseOrderSummaryCard key={purchaseOrder.id} purchaseOrder={purchaseOrder} />
      ))}
    </div>
  );
}

function PurchaseOrderSummaryCard({ purchaseOrder }: { purchaseOrder: POListItem }) {
  const purchaseOrderPath = `/app/project/${purchaseOrder.projectId}/purchase-orders/${purchaseOrder.id}`;
  const purchaseOrderAmount = Number(purchaseOrder.total ?? 0);
  const approvedSubChangeOrders = getApprovedSubChangeOrders(purchaseOrder);
  const approvedSubChangeOrderTotal = approvedSubChangeOrders.reduce(
    (sum, subChangeOrder) => sum + getSubChangeOrderTotalAmount(subChangeOrder),
    0
  );
  const purchaseOrderTotal = purchaseOrderAmount + approvedSubChangeOrderTotal;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            {purchaseOrder.poNumber ?? 'Draft PO'}
          </CardTitle>
          <Badge
            variant={PO_STATUS_BADGE_VARIANTS[purchaseOrder.status] ?? 'primary'}
            appearance="outline"
            size="sm"
          >
            {PO_STATUS_LABELS[purchaseOrder.status] ?? purchaseOrder.status}
          </Badge>
        </div>
        <Link
          to={purchaseOrderPath}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium uppercase tracking-normal text-muted-foreground hover:text-foreground"
        >
          View PO
          <ArrowUpRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <PurchaseOrderField label="PO Amount" value={formatCurrency(purchaseOrderAmount)} />
          {approvedSubChangeOrderTotal > 0 && (
            <PurchaseOrderField
              label="SCO Amount"
              value={`+${formatCurrency(approvedSubChangeOrderTotal)}`}
              valueClassName="text-success"
            />
          )}
          <PurchaseOrderField label="PO Total" value={formatCurrency(purchaseOrderTotal)} />
          <PurchaseOrderField label="Trade Category" value={getTradeCategoryLabel(purchaseOrder)} />
          <PurchaseOrderField
            label="Payment Terms"
            value={formatPaymentTerms(purchaseOrder.paymentTerms)}
          />

          <PurchaseOrderField
            label="Expected Date"
            value={formatOptionalDate(purchaseOrder.expectedDate)}
          />
          <PurchaseOrderField
            label="Delivery Date"
            value={formatOptionalDate(purchaseOrder.deliveryDate)}
          />
          <PurchaseOrderField label="Lead Time" value={purchaseOrder.leadTime || '-'} />
        </div>
      </CardContent>
    </Card>
  );
}

function PurchaseOrderField({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className={`break-words text-sm font-semibold ${valueClassName ?? 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

function getApprovedSubChangeOrders(purchaseOrder: POListItem) {
  return (purchaseOrder.subChangeOrders ?? []).filter(
    (subChangeOrder) => subChangeOrder.status === 'APPROVED'
  );
}

function getTradeCategoryLabel(purchaseOrder: POListItem) {
  return purchaseOrder.tradeCategory?.label ?? purchaseOrder.tradeCategory?.name ?? '-';
}

function formatPaymentTerms(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ') : '-';
}

function formatOptionalDate(value: string | null | undefined) {
  return value ? formatDate(value, { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
}
