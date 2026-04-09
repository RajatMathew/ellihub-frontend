import { type Table } from '@tanstack/react-table';
import { Search, Tag } from 'lucide-react';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@app/components/ui/card';
import { DataGrid } from '@app/components/ui/data-grid';
import { DataGridPagination } from '@app/components/ui/data-grid-pagination';
import { DataGridTable } from '@app/components/ui/data-grid-table';
import { Input, InputWrapper } from '@app/components/ui/input';

import type { CostCodeCategory } from '../schemas/costcode-category.schema';
import type { CostCode } from '../schemas/costcode.schema';

interface CostCodesTableCardProps {
  table: Table<CostCode>;
  categories: CostCodeCategory[];
  categoryFilter: string | undefined;
  searchInput: string;
  isLoading: boolean;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (categoryId: string | undefined) => void;
}

export function CostCodesTableCard({
  table,
  categories,
  categoryFilter,
  searchInput,
  isLoading,
  totalCount,
  onSearchChange,
  onCategoryChange,
}: CostCodesTableCardProps) {
  const tabs = [
    { value: undefined, label: 'All' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
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
        <CardTable>
          <DataGridTable />
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </DataGrid>
    </Card>
  );
}
