import { useMemo } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { Lookup } from '@/modules/lookup/schemas/lookup.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ListFilterPlus, MoreHorizontal, Pencil, Tag, Trash2 } from 'lucide-react';

interface LookupTableCardProps {
  lookups: Lookup[];
  allTypes: string[];
  typeFilter: string | undefined;
  isLoading: boolean;
  isRefreshing?: boolean;
  isError?: boolean;
  refetch?: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  onTypeChange: (type: string | undefined) => void;
  onEdit: (lookup: Lookup) => void;
  onDelete: (lookup: Lookup) => void;
}

export function LookupTableCard({
  lookups,
  allTypes,
  typeFilter,
  isLoading,
  isRefreshing,
  isError,
  refetch,
  search,
  onSearchChange,
  onTypeChange,
  onEdit,
  onDelete,
}: LookupTableCardProps) {
  const typeOptions = [
    { label: 'All Types', value: '__all__' },
    ...allTypes.map((type) => ({ label: type, value: type })),
  ];

  const columns = useMemo<ColumnDef<Lookup>[]>(
    () => [
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <div className="text-sm font-bold text-foreground">{row.original.type}</div>
        ),
        meta: {
          textOverflow: 'truncate',
          skeleton: <Skeleton className="h-4 w-32" />,
        },
      },
      {
        accessorKey: 'label',
        header: 'Label',
        cell: ({ row }) => (
          <div className="text-sm text-foreground">{row.original.label ?? '\u2014'}</div>
        ),
        meta: {
          textOverflow: 'truncate',
          skeleton: <Skeleton className="h-4 w-40" />,
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" mode="icon" size="sm">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        meta: {
          skeleton: <Skeleton className="ms-auto h-7 w-7" />,
        },
      },
    ],
    [onEdit, onDelete]
  );

  const table = useReactTable({
    data: lookups,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card>
      <TableCardHeader
        title={
          isLoading ? (
            <span className="flex items-center">
              <Skeleton className="h-4 w-40" />
            </span>
          ) : (
            <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
              {typeFilter ? `${typeFilter} (${lookups.length})` : `All Lookups (${lookups.length})`}
            </span>
          )
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSelect
              value={typeFilter ?? '__all__'}
              placeholder="All Types"
              icon={ListFilterPlus}
              options={typeOptions}
              onValueChange={(val) => onTypeChange(val === '__all__' ? undefined : val)}
            />
            <TableCardHeaderSearch
              value={search}
              placeholder="Search lookups..."
              onChange={onSearchChange}
            />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={lookups.length}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
        isError={Boolean(isError)}
        errorTitle="Failed to load lookups"
        errorDescription="There was an error fetching the data. Please try again."
        emptyIcon={<Tag className="size-10 text-muted-foreground/50" />}
        emptyTitle="No lookups found"
        onRetry={() => refetch?.()}
      />
    </Card>
  );
}
