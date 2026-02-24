import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@app/components/ui/badge';
import { DataGridColumnHeader } from '@app/components/ui/data-grid-column-header';
import { Skeleton } from '@app/components/ui/skeleton';
import { formatDate } from '@app/lib/helpers';

import type { RFQListItem } from '@modules/rfq/types';

import {
  STATUS_BADGE_APPEARANCE,
  STATUS_BADGE_VARIANT,
  STATUS_LABELS,
  TRADE_CATEGORY_LABELS,
  type MockRFQItem,
} from '../constants/rfq.constants';

export function useRfqColumns() {
  return useMemo<ColumnDef<RFQListItem>[]>(
    () => [
      {
        accessorKey: 'rfqNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="RFQ #" />,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground font-mono">
            {row.original.rfqNumber}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[120px]',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Title" />,
        cell: ({ row }) => {
          const item = row.original as MockRFQItem;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground line-clamp-1">
                {row.original.title}
              </span>
              {item.awardedVendorName ? (
                <span className="text-2sm font-medium flex items-center gap-1 text-success">
                  <CheckCircle2 className="size-3 shrink-0 text-success" />
                  Awarded:{' '}
                  <span className="font-semibold">{item.awardedVendorName}</span>
                </span>
              ) : (
                <span className="text-2sm text-muted-foreground">
                  {TRADE_CATEGORY_LABELS[row.original.tradeCategory] ?? row.original.tradeCategory}
                </span>
              )}
            </div>
          );
        },
        meta: {
          headerClassName: 'min-w-[480px]',
          skeleton: (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
          ),
        },
      },
      {
        accessorKey: 'tradeCategory',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Track" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {TRADE_CATEGORY_LABELS[row.original.tradeCategory] ?? row.original.tradeCategory}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[130px]',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <Badge
              variant={STATUS_BADGE_VARIANT[s] ?? 'secondary'}
              appearance={STATUS_BADGE_APPEARANCE[s] ?? 'default'}
              size="sm"
            >
              {STATUS_LABELS[s] ?? s}
            </Badge>
          );
        },
        meta: {
          headerClassName: 'min-w-[110px]',
          skeleton: <Skeleton className="h-5 w-20 rounded-sm" />,
        },
        enableSorting: true,
      },
      {
        accessorKey: 'quoteDeadline',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Due Date" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-foreground tabular-nums">
            {formatDate(row.original.quoteDeadline)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[140px]',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
      },
      {
        id: 'vendors',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendors" />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground tabular-nums">
            {row.original.vendorsInvitedCount}{' '}
            <span className="text-muted-foreground">
              {row.original.vendorsInvitedCount === 1 ? 'vendor' : 'vendors'}
            </span>
          </span>
        ),
        meta: {
          headerClassName: 'min-w-[110px]',
          skeleton: <Skeleton className="h-3.5 w-20" />,
        },
        enableSorting: false,
      },
      {
        id: 'quotes',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Quotes" />,
        cell: ({ row }) => (
          <Link
            to={`${row.original.rfqNumber}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors tabular-nums"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-semibold text-primary">{row.original.quotesReceivedCount}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{row.original.vendorsInvitedCount}</span>
            <span className="text-muted-foreground ml-0.5">Quotes</span>
          </Link>
        ),
        meta: {
          headerClassName: 'min-w-[110px]',
          skeleton: <Skeleton className="h-6 w-24 rounded-md" />,
        },
        enableSorting: false,
      },
    ],
    [],
  );
}
