import { type Table } from '@tanstack/react-table';
import { AlertCircle, RefreshCcw, Search, Tag } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/app/components/ui/card';
import { DataGrid } from '@/app/components/ui/data-grid';
import { DataGridPagination } from '@/app/components/ui/data-grid-pagination';
import { DataGridTable } from '@/app/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/app/components/ui/input';

import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import type { CostCode } from '@/modules/catalog/schemas/costcode.schema';

interface CostCodesTableCardProps {
  table: Table<CostCode>;
  categories: CostCodeCategory[];
  categoryFilter: string | undefined;
  searchInput: string;
  isLoading: boolean;
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
        <div className="-mx-1 flex min-w-0 overflow-x-auto px-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                categoryFilter === tab.value
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:text-foreground'
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

      {isError ? (
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="size-10 text-destructive/60" />
            <p className="text-sm font-medium">Failed to load cost codes</p>
            <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCcw className="size-3.5" />
              Retry
            </Button>
          </div>
        </CardContent>
      ) : (
        <DataGrid
          table={table}
          recordCount={totalCount}
          isLoading={isLoading}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-8">
              <Tag className="size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No cost codes found</p>
              <p className="text-xs text-muted-foreground">
                Click &quot;+ Add Cost Code&quot; to get started.
              </p>
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
