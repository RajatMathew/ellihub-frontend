import { useMemo } from 'react';

import { getCoreRowModel, getPaginationRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Search, Tag, Trash2 } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/app/components/ui/card';
import { DataGrid } from '@/app/components/ui/data-grid';
import { DataGridPagination } from '@/app/components/ui/data-grid-pagination';
import { DataGridTable } from '@/app/components/ui/data-grid-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@/app/components/ui/input';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';

interface CategoriesTableCardProps {
  categories: CostCodeCategory[];
  isLoading: boolean;
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
          <div className="text-sm font-bold text-foreground">
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div className="line-clamp-1 text-sm text-muted-foreground">
            {row.original.description ?? '\u2014'}
          </div>
        ),
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
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
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
      <CardHeader>
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
          All Categories ({categories.length})
        </h2>
        <CardToolbar>
          <InputWrapper variant="sm">
            <Search className="size-4" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </InputWrapper>
        </CardToolbar>
      </CardHeader>

      {isError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <Tag className="size-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Failed to load categories</p>
            <p className="text-xs text-muted-foreground">
              There was an error fetching the data. Please try again.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch?.()}>
            Try Again
          </Button>
        </div>
      ) : (
        <DataGrid
          table={table}
          recordCount={categories.length}
          isLoading={isLoading}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-8">
              <Tag className="size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No categories found</p>
            </div>
          }
          tableLayout={{ cellBorder: false, rowBorder: true, headerBackground: true }}
        >
          <CardTable className="overflow-x-auto">
            <DataGridTable />
          </CardTable>
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        </DataGrid>
      )}
    </Card>
  );
}
