import { Search, X } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { CardHeader, CardToolbar } from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { PRIME_CHANGE_ORDER_STATUSES } from '@/modules/project/schemas/prime-change-order';
import type { PrimeChangeOrderListParamPatch } from '@/modules/project/hooks/prime-change-order';

interface PrimeChangeOrderListFiltersProps {
  searchInput: string;
  statusFilter?: string;
  totalCostMin?: string;
  totalCostMax?: string;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onUpdateParams: (patch: PrimeChangeOrderListParamPatch) => void;
  onClearFilters: () => void;
}

export function PrimeChangeOrderListFilters({
  searchInput,
  statusFilter,
  totalCostMin,
  totalCostMax,
  hasActiveFilters,
  onSearchChange,
  onUpdateParams,
  onClearFilters,
}: PrimeChangeOrderListFiltersProps) {
  return (
    <CardHeader className="items-stretch sm:items-center">
      <CardToolbar className="w-full sm:w-auto sm:ml-auto">
        <div className="grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          <InputWrapper variant="sm" className="w-full sm:w-64">
            <Search className="size-4" />
            <Input
              placeholder="Search change orders..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputWrapper>

          <Select
            value={statusFilter ?? 'all'}
            onValueChange={(value) =>
              onUpdateParams({
                statusName: value === 'all' ? undefined : value,
                page: undefined,
              })
            }
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PRIME_CHANGE_ORDER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <InputWrapper variant="sm" className="w-full sm:w-32">
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Min cost"
              value={totalCostMin ?? ''}
              onChange={(event) =>
                onUpdateParams({
                  totalCostMin: event.target.value || undefined,
                  page: undefined,
                })
              }
            />
          </InputWrapper>

          <InputWrapper variant="sm" className="w-full sm:w-32">
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Max cost"
              value={totalCostMax ?? ''}
              onChange={(event) =>
                onUpdateParams({
                  totalCostMax: event.target.value || undefined,
                  page: undefined,
                })
              }
            />
          </InputWrapper>

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
