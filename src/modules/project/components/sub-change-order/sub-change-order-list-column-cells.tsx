import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { SCO_STATUS_BADGE_VARIANTS } from '@/modules/project/constants/sub-change-order';
import type { SCOListItem } from '@/modules/project/schemas/sub-change-order';

import {
  formatOptionalSubChangeOrderCurrency,
  formatOptionalSubChangeOrderDate,
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
        <span className="text-2sm text-muted-foreground">
          PO {sco.purchaseOrder.status}
        </span>
      )}
    </div>
  );
}

export function SubChangeOrderTypeCell({
  sco,
  fallback,
}: {
  sco: SCOListItem;
  fallback?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="primary" appearance="outline" size="sm">
        {getSubChangeOrderTypeLabel(sco, fallback)}
      </Badge>
    </div>
  );
}

export function SubChangeOrderRequestedByCell({ sco }: { sco: SCOListItem }) {
  return <span className="text-sm text-foreground">{sco.requestedBy ?? '-'}</span>;
}

export function SubChangeOrderAmountCell({ sco }: { sco: SCOListItem }) {
  return (
    <div className="flex flex-col gap-0.5 text-right">
      <span className="text-sm font-medium text-foreground">
        {formatOptionalSubChangeOrderCurrency(sco.amount)}
      </span>
      {Number(sco.markupAmount ?? 0) !== 0 && (
        <span className="text-2sm text-muted-foreground">
          Markup {formatOptionalSubChangeOrderCurrency(sco.markupAmount)}
        </span>
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
      <span className="text-sm text-foreground">
        {formatOptionalSubChangeOrderDate(sco.date)}
      </span>
      <span className="text-2sm text-muted-foreground">
        {sco.impactsSchedule ? 'Schedule impact' : 'No schedule impact'}
      </span>
      {sco.scheduleImpactDays != null && sco.scheduleImpactDays > 0 && (
        <span className="text-2sm text-muted-foreground">
          {sco.scheduleImpactDays} day{sco.scheduleImpactDays === 1 ? '' : 's'}
        </span>
      )}
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
        {sco.status === 'DRAFT' && (
          <DropdownMenuItem asChild>
            <Link to={`${sco.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
