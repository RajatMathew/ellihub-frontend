import { DataGridSection } from '@/app/components/data-grid-section';
import { Card, CardHeader, CardToolbar } from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import type { CostCode } from '@/modules/catalog/schemas/costcode.schema';
import { type Table } from '@tanstack/react-table';
import { Search, Tag } from 'lucide-react';

interface CostCodesTableCardProps {
  table: Table<CostCode>;
  categories: CostCodeCategory[];
  categoryFilter: string | undefined;
  searchInput: string;
  isLoading: boolean;
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
      <CardHeader>
        <div className="-mx-1 flex min-w-0 overflow-x-auto border-b border-[#a09683] px-1">
          {isCategoriesLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="shrink-0 px-3 py-1.5">
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            : tabs.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  className={`-mb-px shrink-0 border-b-2 px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                    categoryFilter === tab.value
                      ? 'border-primary font-semibold text-primary'
                      : 'border-transparent font-medium text-foreground/75 hover:text-primary'
                  }`}
                  onClick={() => onCategoryChange(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
        </div>
        <CardToolbar>
          <div className="flex items-center gap-2.5">
            <InputWrapper variant="sm">
              <Search className="size-4" />
              <Input
                placeholder="Search cost codes..."
                value={searchInput}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </InputWrapper>
          </div>
        </CardToolbar>
      </CardHeader>

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading}
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
