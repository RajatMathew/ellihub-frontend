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
import { ProjectFilterTabs } from '@/modules/project/components/shared';
import { SCO_STATUS_OPTIONS } from '@/modules/project/constants/sub-change-order';
import type { SubChangeOrderListParamPatch } from '@/modules/project/hooks/sub-change-order';
import type {
  SCOChangeType,
  SCOStatusName,
} from '@/modules/project/schemas/sub-change-order';

interface SubChangeOrderListFiltersProps {
  statusFilter?: SCOStatusName;
  changeTypeFilter?: string;
  hasActiveFilters: boolean;
  searchInput: string;
  changeTypes?: SCOChangeType[];
  onSearchChange: (value: string) => void;
  onUpdateParams: (patch: SubChangeOrderListParamPatch) => void;
  onClearFilters: () => void;
}

const STATUS_TABS = [
  { label: 'All', value: undefined },
  ...SCO_STATUS_OPTIONS,
] as const;

export function SubChangeOrderListFilters({
  statusFilter,
  changeTypeFilter,
  hasActiveFilters,
  searchInput,
  changeTypes = [],
  onSearchChange,
  onUpdateParams,
  onClearFilters,
}: SubChangeOrderListFiltersProps) {
  return (
    <CardHeader className="items-stretch sm:items-center">
      <CardTitle className="w-full overflow-x-auto sm:w-auto">
        <ProjectFilterTabs
          value={statusFilter}
          options={STATUS_TABS}
          onValueChange={(value) => onUpdateParams({ status: value, page: undefined })}
        />
      </CardTitle>
      <CardToolbar className="w-full sm:w-auto">
        <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <InputWrapper variant="sm" className="w-full sm:w-60">
            <Search className="size-4" />
            <Input
              placeholder="Search SCOs..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputWrapper>
          <Select
            value={changeTypeFilter ?? 'all'}
            onValueChange={(value) =>
              onUpdateParams({
                changeTypeId: value === 'all' ? undefined : value,
                page: undefined,
              })
            }
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-48">
              <SelectValue placeholder="All Change Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Change Types</SelectItem>
              {changeTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.label ?? type.name ?? type.code ?? type.id}
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
