import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Calendar } from '@/app/components/ui/calendar';
import { CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';
import { formatDate } from '@/app/lib/helpers';
import { DATE_PRESETS, type SortField } from '@/modules/files/constants/files.constants';
import { CalendarDays, LayoutGrid, List, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface FilesListFiltersProps {
  sortBy: SortField;
  viewMode: 'list' | 'grid';
  hasActiveFilters: boolean;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  totalCount: number;
  onSortChange: (value: string) => void;
  onViewChange: (view: 'list' | 'grid') => void;
  onClearFilters: () => void;
  onDateRangeChange: (from: string | undefined, to: string | undefined) => void;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined;

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function FilesListFilters({
  sortBy,
  viewMode,
  hasActiveFilters,
  dateFrom,
  dateTo,
  totalCount,
  onSortChange,
  onViewChange,
  onClearFilters,
  onDateRangeChange,
}: FilesListFiltersProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(() => {
    const from = parseDateString(dateFrom);
    const to = parseDateString(dateTo);
    return from ? { from, to } : undefined;
  });
  const hasDateRange = !!dateFrom || !!dateTo;
  const dateLabel =
    dateFrom && dateTo
      ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
      : dateFrom
        ? `From ${formatDate(dateFrom)}`
        : dateTo
          ? `Until ${formatDate(dateTo)}`
          : 'Date range';

  return (
    <CardHeader className="items-start">
      <CardTitle className="min-w-0">
        <span className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'item' : 'items'}
        </span>
      </CardTitle>
      <CardToolbar className="w-full min-w-0 flex-wrap justify-start lg:w-auto">
        <div className="grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_10rem_auto] lg:flex lg:w-auto lg:flex-wrap lg:items-center">
          <Popover
            open={popoverOpen}
            onOpenChange={(open) => {
              setPopoverOpen(open);
              if (open) {
                const from = parseDateString(dateFrom);
                const to = parseDateString(dateTo);
                setPendingRange(from ? { from, to } : undefined);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 min-w-0 justify-start gap-1.5 text-xs lg:max-w-64 ${
                  hasDateRange ? 'border-primary text-primary' : ''
                }`}
              >
                <CalendarDays className="size-3.5" />
                <span className="min-w-0 flex-1 truncate text-left">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(calc(100vw-1rem),22rem)] p-0"
              align="start"
              sideOffset={6}
            >
              <div className="flex min-w-0 flex-col">
                <div className="flex min-w-0 flex-wrap gap-1.5 border-b p-3">
                  {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const { from, to } = preset.getValue();
                        setPendingRange({ from, to });
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Calendar
                  mode="range"
                  selected={pendingRange}
                  onSelect={setPendingRange}
                  numberOfMonths={1}
                  disabled={{ after: new Date() }}
                />
                <div className="flex items-center justify-between border-t p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setPendingRange(undefined);
                      onDateRangeChange(undefined, undefined);
                      setPopoverOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const from = pendingRange?.from ? toDateString(pendingRange.from) : undefined;
                      const to = pendingRange?.to ? toDateString(pendingRange.to) : undefined;
                      onDateRangeChange(from, to);
                      setPopoverOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={viewMode}
            className="w-full justify-start sm:w-auto"
            onValueChange={(value) => {
              if (value === 'list' || value === 'grid') onViewChange(value);
            }}
          >
            <ToggleGroupItem value="list" aria-label="List view" className="flex-1 sm:flex-none">
              <List className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="flex-1 sm:flex-none">
              <LayoutGrid className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full text-xs sm:w-auto"
              onClick={onClearFilters}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </CardToolbar>
    </CardHeader>
  );
}
