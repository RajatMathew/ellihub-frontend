import { Search, X } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';
import { Input, InputWrapper } from '@app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';

import { TRACK_TABS, type SortField, type TrackFilter } from '../constants/rfq.constants';

interface RfqListFiltersProps {
  trackFilter: TrackFilter | undefined;
  sortBy: SortField;
  searchInput: string;
  hasActiveFilters: boolean;
  onTrackChange: (track: TrackFilter | undefined) => void;
  onSortChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
}

export function RfqListFilters({
  trackFilter,
  sortBy,
  searchInput,
  hasActiveFilters,
  onTrackChange,
  onSortChange,
  onSearchChange,
  onClearFilters,
}: RfqListFiltersProps) {
  return (
    <CardHeader>
      <CardTitle>
        <div className="flex items-center gap-0">
          <button
            type="button"
            onClick={() => onTrackChange(undefined)}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
              !trackFilter
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {TRACK_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTrackChange(tab.value)}
              className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                trackFilter === tab.value
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardTitle>
      <CardToolbar>
        <div className="flex items-center gap-2.5">
          <InputWrapper variant="sm">
            <Search className="size-4" />
            <Input
              placeholder="Search RFQ..."
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </InputWrapper>
          <Select
            value={sortBy}
            onValueChange={onSortChange}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Newest</SelectItem>
              <SelectItem value="rfqNumber">RFQ #</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="quoteDeadline">Deadline</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
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
