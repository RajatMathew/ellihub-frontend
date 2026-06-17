import { DataGridSection } from '@/app/components/data-grid-section';
import { Badge } from '@/app/components/ui/badge';
import { SCO_STATUS_BADGE_VARIANTS } from '@/modules/project/constants/sub-change-order';
import type { SCOListItem } from '@/modules/project/schemas/sub-change-order';
import type { Table } from '@tanstack/react-table';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  SubChangeOrderActionsCell,
  SubChangeOrderTypeCell,
} from './sub-change-order-list-column-cells';
import {
  formatOptionalSubChangeOrderCurrency,
  formatOptionalSubChangeOrderDate,
  getSubChangeOrderPurchaseOrderLabel,
  getSubChangeOrderTotalAmount,
  getSubChangeOrderTypeLabel,
} from './sub-change-order-list-utils';

interface SubChangeOrderListTableProps {
  table: Table<SCOListItem>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  changeTypeLabelById: Map<string, string>;
}

export function SubChangeOrderListTable({
  table,
  totalCount,
  isLoading,
  isError,
  onRetry,
  changeTypeLabelById,
}: SubChangeOrderListTableProps) {
  return (
    <DataGridSection
      table={table}
      totalCount={totalCount}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Failed to load sub change orders"
      emptyIcon={<ClipboardList className="size-10 text-muted-foreground/50" />}
      emptyTitle="No sub change orders yet"
      emptyDescription="Sub change orders will appear here once created."
      onRetry={onRetry}
      tableLayout={{
        dense: true,
        width: 'auto',
      }}
      tableClassNames={{
        base: 'min-w-full',
      }}
      mobileItem={(sco) => (
        <SubChangeOrderMobileCard sco={sco} changeTypeLabelById={changeTypeLabelById} />
      )}
    />
  );
}

function SubChangeOrderMobileCard({
  sco,
  changeTypeLabelById,
}: {
  sco: SCOListItem;
  changeTypeLabelById: Map<string, string>;
}) {
  const changeTypeFallback = sco.changeTypeId
    ? changeTypeLabelById.get(sco.changeTypeId)
    : undefined;
  const purchaseOrderLabel = getSubChangeOrderPurchaseOrderLabel(sco);
  const title = sco.title ?? sco.description ?? '-';

  return (
    <div className="min-w-0 max-w-full rounded-md border bg-background p-3 shadow-xs shadow-black/5">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <Link
            to={`${sco.id}`}
            className="block max-w-full truncate text-sm font-semibold text-foreground hover:text-primary"
            title={sco.scoNumber ?? undefined}
          >
            {sco.scoNumber ?? '-'}
          </Link>
          <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">{title}</p>
        </div>
        <SubChangeOrderActionsCell sco={sco} />
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge
          variant={SCO_STATUS_BADGE_VARIANTS[sco.status] ?? 'primary'}
          appearance="outline"
          size="sm"
        >
          {sco.status}
        </Badge>
        <SubChangeOrderTypeCell sco={sco} fallback={changeTypeFallback} />
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 text-xs">
        <SubChangeOrderMobileMetric
          label="Purchase Order"
          value={purchaseOrderLabel}
          to={
            sco.purchaseOrder?.id
              ? `/app/project/${sco.projectId}/purchase-orders/${sco.purchaseOrder.id}`
              : undefined
          }
        />
        <SubChangeOrderMobileMetric
          label="Amount"
          value={formatOptionalSubChangeOrderCurrency(getSubChangeOrderTotalAmount(sco))}
        />
        <SubChangeOrderMobileMetric
          label="Date"
          value={formatOptionalSubChangeOrderDate(sco.date)}
        />
        <SubChangeOrderMobileMetric
          label="Created"
          value={formatOptionalSubChangeOrderDate(sco.createdAt)}
        />
        <SubChangeOrderMobileMetric
          label="Change Type"
          value={getSubChangeOrderTypeLabel(sco, changeTypeFallback)}
        />
        <SubChangeOrderMobileMetric label="PO Status" value={sco.purchaseOrder?.status ?? '-'} />
      </div>
    </div>
  );
}

function SubChangeOrderMobileMetric({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      {to ? (
        <Link
          to={to}
          className="mt-1 block truncate font-medium tabular-nums text-foreground hover:text-primary"
          title={value}
        >
          {value}
        </Link>
      ) : (
        <p className="mt-1 truncate font-medium tabular-nums text-foreground" title={value}>
          {value}
        </p>
      )}
    </div>
  );
}
