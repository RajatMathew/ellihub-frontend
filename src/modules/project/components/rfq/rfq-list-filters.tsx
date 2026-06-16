import { Search, X } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  ProjectFilterTabs,
  type ProjectFilterTabOption,
} from '@/modules/project/components/shared';
import type { RFQListParamPatch } from '@/modules/project/hooks/rfq';
import type { Lookup } from '@/modules/project/schemas/lookup.schema';
import type { RFQStatus } from '@/modules/project/schemas/rfq';

const RFQ_STATUS_FILTER_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'AWARDED', label: 'Awarded' },
] as const;

interface RFQListFiltersProps {
  trackFilter?: string;
  statusFilter?: string;
  hasActiveFilters: boolean;
  searchInput: string;
  tradeCategories?: Lookup[];
  statuses?: RFQStatus[];
  onSearchChange: (value: string) => void;
  onUpdateParams: (patch: RFQListParamPatch) => void;
  onClearFilters: () => void;
}

export function RFQListFilters({
  trackFilter,
  statusFilter,
  hasActiveFilters,
  searchInput,
  tradeCategories,
  onSearchChange,
  onUpdateParams,
  onClearFilters,
}: RFQListFiltersProps) {
  const trackOptions: ProjectFilterTabOption[] = [
    { label: 'All', value: undefined },
    ...(tradeCategories ?? []).map((category) => {
      const label = category.label ?? category.name ?? category.id;

      return {
        label,
        value: label,
      };
    }),
  ];
  return (
    <CardHeader className="items-stretch sm:items-center">
      <CardTitle className="w-full overflow-x-auto sm:w-auto">
        <ProjectFilterTabs
          value={trackFilter}
          options={trackOptions}
          onValueChange={(value) => onUpdateParams({ track: value, page: undefined })}
        />
      </CardTitle>
      <CardToolbar className="w-full sm:w-auto">
        <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <InputWrapper variant="sm" className="w-full sm:w-60">
            <Search className="size-4" />
            <Input
              placeholder="Search RFQs..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputWrapper>

          <Select
            value={statusFilter ?? 'all'}
            onValueChange={(value) =>
              onUpdateParams({
                statusId: value === 'all' ? undefined : value,
                page: undefined,
              })
            }
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-36">
              <SelectValue placeholder="All..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {RFQ_STATUS_FILTER_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
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
  );
}
