import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Input } from '@/app/components/ui/input';
import type { PrimeChangeOrderListParamPatch } from '@/modules/project/hooks/prime-change-order';
import { PRIME_CHANGE_ORDER_STATUSES } from '@/modules/project/schemas/prime-change-order';
import { ListFilterPlus } from 'lucide-react';

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

const tableHeaderFilterTriggerClassName =
  'h-8 w-full rounded-md border-table-card-header-foreground/25 bg-card-header text-xs font-medium text-table-card-header-foreground shadow-xs shadow-black/10 placeholder:text-table-card-header-foreground/75 hover:border-table-card-header-foreground/40 hover:bg-card-header focus-visible:!border-table-card-header-foreground/40 focus-visible:!outline-none focus-visible:!ring-0 sm:w-32';

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
    <TableCardHeader
      title={
        <span className="flex items-center font-mono text-xs font-semibold uppercase tracking-[0.08em] !text-table-card-header-foreground">
          Prime Change Orders
        </span>
      }
      actions={
        <TableCardHeaderToolbar className="flex-wrap justify-end sm:ml-auto">
          <TableCardHeaderSearch
            value={searchInput}
            placeholder="Search change orders..."
            onChange={onSearchChange}
            className="sm:w-64"
          />

          <TableCardHeaderSelect
            value={statusFilter ?? 'all'}
            placeholder="All Statuses"
            icon={ListFilterPlus}
            options={[
              { label: 'All Statuses', value: 'all' },
              ...PRIME_CHANGE_ORDER_STATUSES.map((status) => ({ label: status, value: status })),
            ]}
            onValueChange={(value) =>
              onUpdateParams({
                statusName: value === 'all' ? undefined : value,
                page: undefined,
              })
            }
          />

          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Min cost"
            value={totalCostMin ?? ''}
            className={tableHeaderFilterTriggerClassName}
            onChange={(event) =>
              onUpdateParams({
                totalCostMin: event.target.value || undefined,
                page: undefined,
              })
            }
          />

          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Max cost"
            value={totalCostMax ?? ''}
            className={tableHeaderFilterTriggerClassName}
            onChange={(event) =>
              onUpdateParams({
                totalCostMax: event.target.value || undefined,
                page: undefined,
              })
            }
          />

          <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearFilters} />
        </TableCardHeaderToolbar>
      }
    />
  );
}
