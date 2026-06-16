import { DataGridSection } from '@/app/components/data-grid-section';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getGCTypeOptionLabel } from '@/modules/directory/components/gc/gc-list-utils';
import { GC_STATUS_LABELS } from '@/modules/directory/constants/gc/gc-list.constants';
import type { GCStatus, GCType, GeneralContractor } from '@/modules/directory/schemas/gc.schema';
import { type Table } from '@tanstack/react-table';
import { Building2, Filter, Search, X } from 'lucide-react';

interface GCTableCardProps {
  table: Table<GeneralContractor>;
  typeTabs: GCType[];
  gcTypeIdFilter: string | undefined;
  statusFilter: GCStatus | undefined;
  searchInput: string;
  isLoading: boolean;
  isTypesLoading: boolean;
  isError: boolean;
  totalCount: number;
  hasActiveFilters: boolean;
  onTypeChange: (typeId: string | undefined) => void;
  onStatusChange: (status: GCStatus | undefined) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

export function GCTableCard({
  table,
  typeTabs,
  gcTypeIdFilter,
  statusFilter,
  searchInput,
  isLoading,
  isTypesLoading,
  isError,
  totalCount,
  hasActiveFilters,
  onTypeChange,
  onStatusChange,
  onSearchChange,
  onClearFilters,
  onRetry,
}: GCTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isTypesLoading ? (
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-0 border-b border-[#a09683]">
              <TypeTab
                active={!gcTypeIdFilter}
                label="All"
                onClick={() => onTypeChange(undefined)}
              />
              {typeTabs.map((tab) => (
                <TypeTab
                  key={tab.id}
                  active={gcTypeIdFilter === tab.id}
                  label={getGCTypeOptionLabel(tab)}
                  onClick={() => onTypeChange(tab.id)}
                />
              ))}
            </div>
          )}
        </CardTitle>
        <CardToolbar className="w-full sm:w-auto">
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            <InputWrapper variant="sm" className="w-full sm:w-64">
              <Search className="size-4" />
              <Input
                placeholder="Search GCs..."
                value={searchInput}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputWrapper>

            <Select
              value={statusFilter ?? 'all'}
              onValueChange={(value) =>
                onStatusChange(value === 'all' ? undefined : (value as GCStatus))
              }
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-44">
                <Filter className="me-1.5 size-3.5" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(GC_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearFilters}>
                <X className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardToolbar>
      </CardHeader>

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading}
        isError={isError}
        errorTitle="Failed to load general contractors"
        emptyIcon={<Building2 className="size-10 text-muted-foreground/50" />}
        emptyTitle="No general contractors yet"
        emptyDescription={'Click "+ Add GC" to get started.'}
        onRetry={onRetry}
        tableLayout={{
          width: 'auto',
        }}
        tableClassNames={{
          base: 'min-w-full',
        }}
      />
    </Card>
  );
}

function TypeTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? '-mb-px border-b-2 border-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition-colors'
          : '-mb-px border-b-2 border-transparent px-4 py-2 text-xs font-medium uppercase tracking-wider text-foreground/75 transition-colors hover:text-primary'
      }
    >
      {label}
    </button>
  );
}
