import { useMemo } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderSearch,
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
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Tag, Trash2 } from 'lucide-react';

interface CategoriesTableCardProps {
  categories: CostCodeCategory[];
  isLoading: boolean;
  isRefreshing?: boolean;
  isError?: boolean;
  refetch?: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  onEdit: (category: CostCodeCategory) => void;
  onDelete: (category: CostCodeCategory) => void;
}

export function CategoriesTableCard({
  categories,
  isLoading,
  isRefreshing,
  isError,
  refetch,
  search,
  onSearchChange,
  onEdit,
  onDelete,
}: CategoriesTableCardProps) {
  const columns = useMemo<ColumnDef<CostCodeCategory>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="text-sm font-bold text-foreground">{row.original.name}</div>
        ),
        meta: {
          textOverflow: 'truncate',
          skeleton: <Skeleton className="h-4 w-40" />,
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div className="line-clamp-1 text-sm text-muted-foreground">
            {row.original.description ?? '\u2014'}
          </div>
        ),
        meta: {
          textOverflow: 'scroll',
          skeleton: <Skeleton className="h-4 w-full max-w-80" />,
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
    data: categories,
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
              All Categories ({categories.length})
            </span>
          )
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSearch
              value={search}
              placeholder="Search categories..."
              onChange={onSearchChange}
            />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={categories.length}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
        isError={Boolean(isError)}
        errorTitle="Failed to load categories"
        errorDescription="There was an error fetching the data. Please try again."
        emptyIcon={<Tag className="size-10 text-muted-foreground/50" />}
        emptyTitle="No categories found"
        onRetry={() => refetch?.()}
      />
    </Card>
  );
}
