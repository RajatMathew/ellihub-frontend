import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderSearch,
  TableCardHeaderTabs,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Card } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import type { CostCode } from '@/modules/catalog/schemas/costcode.schema';
import { type Table } from '@tanstack/react-table';
import { Tag } from 'lucide-react';

interface CostCodesTableCardProps {
  table: Table<CostCode>;
  categories: CostCodeCategory[];
  categoryFilter: string | undefined;
  searchInput: string;
  isLoading: boolean;
  isRefreshing?: boolean;
  isCategoriesLoading?: boolean;
  isError: boolean;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (categoryId: string | undefined) => void;
  onRetry: () => void;
}

export function CostCodesTableCard({
  table,
  categories,
  categoryFilter,
  searchInput,
  isLoading,
  isRefreshing,
  isCategoriesLoading,
  isError,
  totalCount,
  onSearchChange,
  onCategoryChange,
  onRetry,
}: CostCodesTableCardProps) {
  const tabs = [
    { value: undefined, label: 'All' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Card>
      <TableCardHeader
        title={
          isCategoriesLoading ? (
            <div className="flex flex-wrap items-center gap-2 py-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-28" />
            </div>
          ) : (
            <TableCardHeaderTabs
              activeValue={categoryFilter}
              tabs={tabs}
              onChange={onCategoryChange}
            />
          )
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search cost codes..."
              onChange={onSearchChange}
            />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
        isError={isError}
        errorTitle="Failed to load cost codes"
        emptyIcon={<Tag className="size-10 text-muted-foreground/50" />}
        emptyTitle="No cost codes found"
        emptyDescription={'Click "+ Add Cost Code" to get started.'}
        onRetry={onRetry}
      />
    </Card>
  );
}
