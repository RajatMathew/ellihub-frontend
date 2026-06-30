import type { ActivityLogItem } from '@/app/api/activity-log.api';
import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Badge } from '@/app/components/ui/badge';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import {
  ACTIVITY_ACTION_OPTIONS,
  ACTIVITY_ENTITY_OPTIONS,
  getActivityActionMeta,
  getActivityEntityLabel,
} from '@/modules/activity-log/constants/activity-log.constants';
import type { Table } from '@tanstack/react-table';
import { ListFilterPlus, Search } from 'lucide-react';

interface ActivityLogTableProps {
  table: Table<ActivityLogItem>;
  totalCount: number;
  searchInput: string;
  entityType: string | undefined;
  action: string | undefined;
  from: string | undefined;
  to: string | undefined;
  isLoading: boolean;
  isRefreshing?: boolean;
  isError: boolean;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onEntityTypeChange: (value: string | undefined) => void;
  onActionChange: (value: string | undefined) => void;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

const headerInputControlClassName =
  'h-8 w-full rounded-md border-table-card-header-foreground/25 bg-card-header text-xs font-medium text-table-card-header-foreground shadow-xs shadow-black/10 hover:border-table-card-header-foreground/40 hover:bg-card-header focus-visible:!border-table-card-header-foreground/40 focus-visible:!outline-none focus-visible:!ring-0 sm:w-36';

export function ActivityLogTable({
  table,
  totalCount,
  searchInput,
  entityType,
  action,
  from,
  to,
  isLoading,
  isRefreshing,
  isError,
  hasActiveFilters,
  onSearchChange,
  onEntityTypeChange,
  onActionChange,
  onFromChange,
  onToChange,
  onClearFilters,
  onRetry,
}: ActivityLogTableProps) {
  const entityOptions = [{ label: 'All Entities', value: 'all' }, ...ACTIVITY_ENTITY_OPTIONS];
  const actionOptions = [{ label: 'All Actions', value: 'all' }, ...ACTIVITY_ACTION_OPTIONS];

  return (
    <Card>
      <TableCardHeader
        title={
          <div className="flex flex-col justify-center gap-1">
            <span className="text-xs font-semibold tracking-normal text-table-card-header-foreground">
              Event Stream
            </span>
            <span className="text-xs text-table-card-header-foreground/75">
              {totalCount} log entr{totalCount === 1 ? 'y' : 'ies'}
            </span>
          </div>
        }
        actions={
          <TableCardHeaderToolbar className="flex-wrap justify-start xl:justify-end">
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search activity..."
              onChange={onSearchChange}
              className="sm:w-64"
            />

            <TableCardHeaderSelect
              value={entityType ?? 'all'}
              placeholder="All Entities"
              icon={ListFilterPlus}
              options={entityOptions}
              className="sm:w-48"
              onValueChange={(value) => onEntityTypeChange(value === 'all' ? undefined : value)}
            />

            <TableCardHeaderSelect
              value={action ?? 'all'}
              placeholder="All Actions"
              icon={ListFilterPlus}
              options={actionOptions}
              className="sm:w-40"
              onValueChange={(value) => onActionChange(value === 'all' ? undefined : value)}
            />

            <Input
              type="date"
              value={from ?? ''}
              className={headerInputControlClassName}
              onChange={(event) => onFromChange(event.target.value || undefined)}
            />
            <Input
              type="date"
              value={to ?? ''}
              className={headerInputControlClassName}
              onChange={(event) => onToChange(event.target.value || undefined)}
            />

            <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearFilters} />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
        isError={isError}
        errorTitle="Failed to load activity logs"
        emptyIcon={<ActivityEmptyIcon />}
        emptyTitle="No activity found"
        emptyDescription={
          hasActiveFilters
            ? 'Try adjusting the filters.'
            : 'Activity will appear here once users make changes.'
        }
        onRetry={onRetry}
        tableLayout={{ dense: true, rowBorder: true, headerBackground: true }}
      />
    </Card>
  );
}

export function ActivityActionBadge({ action }: { action: string }) {
  const meta = getActivityActionMeta(action);
  return (
    <Badge variant={meta.variant} appearance="light" size="sm">
      {meta.label}
    </Badge>
  );
}

export function ActivityEntityBadge({ entityType }: { entityType: string }) {
  return (
    <Badge variant="outline" size="sm">
      {getActivityEntityLabel(entityType)}
    </Badge>
  );
}

function ActivityEmptyIcon() {
  return (
    <div className="flex size-10 items-center justify-center rounded-md border bg-muted/30">
      <Search className="size-5 text-muted-foreground/60" />
    </div>
  );
}
