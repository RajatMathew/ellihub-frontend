import { useMemo } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardToolbar } from '@/app/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { Lookup } from '@/modules/lookup/schemas/lookup.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Search, Tag, Trash2 } from 'lucide-react';

interface LookupTableCardProps {
  lookups: Lookup[];
  allTypes: string[];
  typeFilter: string | undefined;
  isLoading: boolean;
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
  isError,
  refetch,
  search,
  onSearchChange,
  onTypeChange,
  onEdit,
  onDelete,
}: LookupTableCardProps) {
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
      <CardHeader>
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <h2 className="text-sm font-bold tracking-normal text-foreground">
            {typeFilter ? `${typeFilter} (${lookups.length})` : `All Lookups (${lookups.length})`}
          </h2>
        )}
        <CardToolbar>
          <div className="flex items-center gap-2.5">
            <Select
              value={typeFilter ?? '__all__'}
              onValueChange={(val) => onTypeChange(val === '__all__' ? undefined : val)}
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {allTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputWrapper variant="sm">
              <Search className="size-4" />
              <Input
                placeholder="Search lookups..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </InputWrapper>
          </div>
        </CardToolbar>
      </CardHeader>

      <DataGridSection
        table={table}
        totalCount={lookups.length}
        isLoading={isLoading}
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
