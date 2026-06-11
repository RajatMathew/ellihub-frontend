import { useMemo, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTable, CardTitle } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { DataGrid } from '@/app/components/ui/data-grid';
import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { DataGridTable } from '@/app/components/ui/data-grid-table';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import type {
  MonthlyBillsSubcontractorPO,
  MonthlyBillsSubcontractorPOGroup,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { AlertCircle, ClipboardList, ExternalLink, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SubcontractorPOGroupsProps {
  groups: MonthlyBillsSubcontractorPOGroup[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const EMPTY_TABLE_DATA: MonthlyBillsSubcontractorPO[] = [];

function getProjectTitle(group: MonthlyBillsSubcontractorPOGroup) {
  return group.project.jobNumber
    ? `${group.project.name} - ${group.project.jobNumber}`
    : group.project.name;
}

function useSubcontractorPOColumns() {
  return useMemo<ColumnDef<MonthlyBillsSubcontractorPO>[]>(
    () => [
      {
        id: 'select',
        header: () => <Checkbox disabled aria-label="Select all purchase orders" size="sm" />,
        cell: () => <Checkbox disabled aria-label="Select purchase order" size="sm" />,
        meta: {
          headerClassName: 'w-12',
          skeleton: <Skeleton className="size-4 rounded-sm" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'poNumber',
        header: ({ column }) => <DataGridColumnHeader column={column} title="PO #" />,
        cell: ({ row }) => (
          <Link
            to={`/app/project/${row.original.projectId}/purchase-orders/${row.original.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
          >
            {row.original.poNumber}
            <ExternalLink className="size-3.5" />
          </Link>
        ),
        meta: {
          headerClassName: 'min-w-56',
          skeleton: <Skeleton className="h-3.5 w-36" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'poDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="PO Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.poDate)}</span>
        ),
        meta: {
          headerClassName: 'min-w-36',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'amountTotal',
        header: ({ column }) => <DataGridColumnHeader column={column} title="PO Amount" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {formatCurrency(row.original.amountTotal)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-36',
          skeleton: <Skeleton className="h-3.5 w-24" />,
        },
        enableSorting: false,
      },
      {
        accessorKey: 'vendor.name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">{row.original.vendor.name}</span>
        ),
        meta: {
          headerClassName: 'min-w-48',
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
        enableSorting: false,
      },
    ],
    []
  );
}

export function SubcontractorPOGroups({
  groups,
  isLoading,
  isError,
  onRetry,
}: SubcontractorPOGroupsProps) {
  if (isError) {
    return (
      <Card className="overflow-hidden">
        <SubcontractorPOFeedback
          icon={<AlertCircle className="size-10 text-destructive/60" />}
          title="Failed to load subcontractor purchase orders"
          description="Something went wrong. Please try again."
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCcw className="size-3.5" />
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <SubcontractorPOGroupTable
          title="Subcontractor Purchase Orders"
          purchaseOrders={EMPTY_TABLE_DATA}
          isLoading
        />
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="overflow-hidden">
        <SubcontractorPOFeedback
          icon={<ClipboardList className="size-10 text-muted-foreground/50" />}
          title="No subcontractor purchase orders"
          description="Non-draft purchase orders will appear here once available."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <Card key={group.project.id} className="overflow-hidden">
          <SubcontractorPOGroupTable
            title={getProjectTitle(group)}
            purchaseOrders={group.purchaseOrders}
          />
        </Card>
      ))}
    </div>
  );
}

function SubcontractorPOFeedback({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <CardContent>
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        {icon}
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {action}
      </div>
    </CardContent>
  );
}

function SubcontractorPOGroupTable({
  title,
  purchaseOrders,
  isLoading = false,
}: {
  title: string;
  purchaseOrders: MonthlyBillsSubcontractorPO[];
  isLoading?: boolean;
}) {
  const columns = useSubcontractorPOColumns();
  const table = useReactTable({
    data: purchaseOrders,
    columns,
    pageCount: 1,
    state: {
      pagination: { pageIndex: 0, pageSize: Math.max(purchaseOrders.length, 1) },
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <>
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <DataGrid
        table={table}
        recordCount={purchaseOrders.length}
        isLoading={isLoading}
        tableLayout={{
          dense: true,
          width: 'auto',
        }}
        tableClassNames={{
          base: 'min-w-full',
        }}
      >
        <CardTable className="overflow-x-auto">
          <DataGridTable />
        </CardTable>
      </DataGrid>
    </>
  );
}
