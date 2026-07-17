import { memo } from 'react';

import { Button } from '@/app/components/ui/button';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  PROJECT_DIVISION_OPTIONS,
  PROJECT_LIST_SORT_OPTIONS,
  type ProjectListSortBy,
  type ProjectListSortOrder,
} from '@/modules/project/constants/project.constants';
import type { Division } from '@/modules/project/schemas/project.schema';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface ProjectListControlsProps {
  searchInput: string;
  division?: Division;
  sortBy: ProjectListSortBy;
  sortOrder: ProjectListSortOrder;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onDivisionChange: (value: Division | undefined) => void;
  onSortByChange: (value: ProjectListSortBy) => void;
  onSortOrderChange: (value: ProjectListSortOrder) => void;
  onClear: () => void;
}

export const ProjectListControls = memo(function ProjectListControls({
  searchInput,
  division,
  sortBy,
  sortOrder,
  hasActiveFilters,
  onSearchChange,
  onDivisionChange,
  onSortByChange,
  onSortOrderChange,
  onClear,
}: ProjectListControlsProps) {
  return (
    <div className="mb-4 rounded-lg border border-card-border bg-card p-3 shadow-xs shadow-black/5">
      <div className="grid w-full grid-cols-1 gap-2.5 md:grid-cols-[minmax(220px,1fr)_minmax(150px,180px)_minmax(160px,190px)_minmax(130px,150px)_auto] md:items-center">
        <InputWrapper variant="sm" className="min-w-0">
          <Search className="size-4" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects"
          />
        </InputWrapper>

        <Select
          value={division ?? 'all'}
          onValueChange={(value) =>
            onDivisionChange(value === 'all' ? undefined : (value as Division))
          }
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="All Divisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {PROJECT_DIVISION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(value) => onSortByChange(value as ProjectListSortBy)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_LIST_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortOrder}
          onValueChange={(value) => onSortOrderChange(value as ProjectListSortOrder)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 justify-center text-xs"
            onClick={onClear}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        ) : (
          <div className="hidden h-7 items-center justify-center text-muted-foreground md:flex">
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
});
