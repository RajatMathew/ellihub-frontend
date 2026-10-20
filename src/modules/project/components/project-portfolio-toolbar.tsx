import { memo } from 'react';

import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderFilters,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderTitle,
} from '@/app/components/table-card-header';
import { Card } from '@/app/components/ui/card';
import {
  PROJECT_DIVISION_OPTIONS,
  PROJECT_LIST_SORT_OPTIONS,
  type ProjectListSortBy,
  type ProjectListSortOrder,
} from '@/modules/project/constants/project.constants';
import type { Division } from '@/modules/project/schemas/project.schema';
import { ArrowDownUp, ArrowUpDown, Building2 } from 'lucide-react';

const ALL_DIVISIONS = 'all';
const DIVISION_OPTIONS = [
  { value: ALL_DIVISIONS, label: 'All Divisions' },
  ...PROJECT_DIVISION_OPTIONS,
];
const SORT_ORDER_OPTIONS = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
];

interface ProjectPortfolioToolbarProps {
  searchInput: string;
  division?: Division;
  sortBy: ProjectListSortBy;
  sortOrder: ProjectListSortOrder;
  /** How many projects the current filters match; undefined while it loads. */
  totalProjects?: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onDivisionChange: (value: Division | undefined) => void;
  onSortByChange: (value: ProjectListSortBy) => void;
  onSortOrderChange: (value: ProjectListSortOrder) => void;
  onClear: () => void;
}

/**
 * The portfolio's search, division and sort, in both the board and the list.
 *
 * Built from the card-header pieces every other list uses, so the search sits
 * where it does on Vendors or Purchase Orders - right of the card's title, with
 * Clear first and `/` to reach it - rather than in a card of its own.
 */
export const ProjectPortfolioToolbar = memo(function ProjectPortfolioToolbar({
  searchInput,
  division,
  sortBy,
  sortOrder,
  totalProjects,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onDivisionChange,
  onSortByChange,
  onSortOrderChange,
  onClear,
}: ProjectPortfolioToolbarProps) {
  return (
    <Card className="mb-4">
      <TableCardHeader
        title={
          <TableCardHeaderTitle
            isLoading={totalProjects === undefined}
            description={totalProjects === 1 ? '1 project' : `${totalProjects ?? 0} projects`}
          >
            Projects
          </TableCardHeaderTitle>
        }
        actions={
          <TableCardHeaderFilters>
            <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClear} />
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search projects..."
              onChange={onSearchChange}
              onClear={onSearchClear}
              shortcut
            />
            <TableCardHeaderSelect
              value={division ?? ALL_DIVISIONS}
              placeholder="All Divisions"
              options={DIVISION_OPTIONS}
              icon={Building2}
              onValueChange={(value) =>
                onDivisionChange(value === ALL_DIVISIONS ? undefined : (value as Division))
              }
            />
            <TableCardHeaderSelect
              value={sortBy}
              placeholder="Sort by"
              options={PROJECT_LIST_SORT_OPTIONS}
              icon={ArrowUpDown}
              onValueChange={(value) => onSortByChange(value as ProjectListSortBy)}
            />
            <TableCardHeaderSelect
              value={sortOrder}
              placeholder="Order"
              options={SORT_ORDER_OPTIONS}
              icon={ArrowDownUp}
              className="sm:w-40"
              onValueChange={(value) => onSortOrderChange(value as ProjectListSortOrder)}
            />
          </TableCardHeaderFilters>
        }
      />
    </Card>
  );
});
