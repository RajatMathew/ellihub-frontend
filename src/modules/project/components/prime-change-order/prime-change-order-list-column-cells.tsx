import { ExternalLink } from 'lucide-react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import type { PrimeChangeOrder } from '@/modules/project/schemas/prime-change-order';
import {
  formatPrimeChangeOrderCost,
  formatPrimeChangeOrderDate,
  formatPrimeChangeOrderTitleCase,
  getPrimeChangeOrderFieldwireUrl,
  getPrimeChangeOrderStatusDotClass,
} from '@/modules/project/components/prime-change-order/prime-change-order-list-utils';

export function PrimeChangeOrderReferenceCell({ order }: { order: PrimeChangeOrder }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-foreground">
        {order.referenceNumber ?? '-'}
      </div>
      <div className="text-xs text-muted-foreground">
        {order.pmGroupNumber != null ? `Rev. ${order.pmGroupNumber}` : 'Rev. -'}
      </div>
    </div>
  );
}

export function PrimeChangeOrderNameCell({ order }: { order: PrimeChangeOrder }) {
  return (
    <div className="max-w-lg truncate text-sm font-medium text-foreground">{order.name}</div>
  );
}

export function PrimeChangeOrderStatusCell({ order }: { order: PrimeChangeOrder }) {
  return (
    <div className="flex items-center gap-2 text-sm text-foreground">
      <span className={`size-2 rounded-full ${getPrimeChangeOrderStatusDotClass(order.statusName)}`} />
      <span>{order.statusName}</span>
      {order.deletedAt && (
        <Badge variant="destructive" appearance="light" size="sm">
          Deleted
        </Badge>
      )}
    </div>
  );
}

export function PrimeChangeOrderScheduleImpactCell({ order }: { order: PrimeChangeOrder }) {
  if (!order.scheduleImpact) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <span className="text-sm text-muted-foreground">
      {formatPrimeChangeOrderTitleCase(order.scheduleImpact)}
      {order.scheduleImpactDays != null ? ` (${order.scheduleImpactDays}d)` : ''}
    </span>
  );
}

export function PrimeChangeOrderDueDateCell({ order }: { order: PrimeChangeOrder }) {
  return (
    <span className="text-sm text-muted-foreground">
      {formatPrimeChangeOrderDate(order.dueDate)}
    </span>
  );
}

export function PrimeChangeOrderCostCell({ order }: { order: PrimeChangeOrder }) {
  const isNegative = Number(order.totalCost ?? 0) < 0;

  return (
    <span
      className={`block text-right text-sm font-semibold tabular-nums ${
        isNegative ? 'text-destructive' : 'text-foreground'
      }`}
    >
      {formatPrimeChangeOrderCost(order.totalCost)}
    </span>
  );
}

export function PrimeChangeOrderAssigneeCell({ order }: { order: PrimeChangeOrder }) {
  const { assignee } = order;

  if (!assignee) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <div className="max-w-56 space-y-0.5">
      <div className="truncate text-sm font-medium text-foreground">{assignee.displayName}</div>
      {(assignee.company || assignee.jobTitle) && (
        <div className="truncate text-xs text-muted-foreground">
          {assignee.company ?? assignee.jobTitle}
        </div>
      )}
    </div>
  );
}

export function PrimeChangeOrderFieldwireCell({ order }: { order: PrimeChangeOrder }) {
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" asChild>
      <a href={getPrimeChangeOrderFieldwireUrl(order)} target="_blank" rel="noreferrer">
        <ExternalLink className="size-3.5" />
        Fieldwire
      </a>
    </Button>
  );
}
