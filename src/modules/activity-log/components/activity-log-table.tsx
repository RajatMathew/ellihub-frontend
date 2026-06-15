import type { ActivityLogItem } from '@/app/api/activity-log.api';
import { DataGridSection } from '@/app/components/data-grid-section';
import { Badge } from '@/app/components/ui/badge';
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
import {
  ACTIVITY_ACTION_OPTIONS,
  ACTIVITY_ENTITY_OPTIONS,
  getActivityActionMeta,
  getActivityEntityLabel,
} from '@/modules/activity-log/constants/activity-log.constants';
import type { Table } from '@tanstack/react-table';
import { Search, X } from 'lucide-react';

interface ActivityLogTableProps {
  table: Table<ActivityLogItem>;
  totalCount: number;
  searchInput: string;
  entityType: string | undefined;
  action: string | undefined;
  from: string | undefined;
  to: string | undefined;
  isLoading: boolean;
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

export function ActivityLogTable({
  table,
  totalCount,
  searchInput,
  entityType,
  action,
  from,
  to,
  isLoading,
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
  return (
    <Card>
      <CardHeader className="items-start gap-4 xl:flex-row xl:items-center">
        <div className="space-y-1">
          <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground">
            Event Stream
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {totalCount} log entr{totalCount === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <CardToolbar className="w-full flex-wrap justify-start gap-2 xl:w-auto xl:justify-end">
          <InputWrapper variant="sm" className="w-full sm:w-64">
            <Search className="size-4" />
            <Input
              placeholder="Search activity..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputWrapper>

          <Select
            value={entityType ?? 'all'}
            onValueChange={(value) => onEntityTypeChange(value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-48">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {ACTIVITY_ENTITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={action ?? 'all'}
            onValueChange={(value) => onActionChange(value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTIVITY_ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={from ?? ''}
            className="h-8 w-full text-xs sm:w-36"
            onChange={(event) => onFromChange(event.target.value || undefined)}
          />
          <Input
            type="date"
            value={to ?? ''}
            className="h-8 w-full text-xs sm:w-36"
            onChange={(event) => onToChange(event.target.value || undefined)}
          />

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </CardToolbar>
      </CardHeader>

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading}
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
