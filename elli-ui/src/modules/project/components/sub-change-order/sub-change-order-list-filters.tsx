import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { ProjectFilterTabs } from '@/modules/project/components/shared';
import { SCO_STATUS_OPTIONS } from '@/modules/project/constants/sub-change-order';
import type { SubChangeOrderListParamPatch } from '@/modules/project/hooks/sub-change-order';
import type { SCOChangeType, SCOStatusName } from '@/modules/project/schemas/sub-change-order';
import { ListFilterPlus } from 'lucide-react';

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

const STATUS_TABS = [{ label: 'All', value: undefined }, ...SCO_STATUS_OPTIONS] as const;
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
    <TableCardHeader
      title={
        <ProjectFilterTabs
          value={statusFilter}
          options={STATUS_TABS}
          onValueChange={(value) => onUpdateParams({ status: value, page: undefined })}
        />
      }
      actions={
        <TableCardHeaderToolbar className="flex-wrap">
          <TableCardHeaderSearch
            value={searchInput}
            placeholder="Search SCOs..."
            onChange={onSearchChange}
            className="sm:w-60"
          />
          <TableCardHeaderSelect
            value={changeTypeFilter ?? 'all'}
            placeholder="All Change Types"
            icon={ListFilterPlus}
            options={[
              { label: 'All Change Types', value: 'all' },
              ...changeTypes.map((type) => ({
                label: type.label ?? type.name ?? type.code ?? type.id,
                value: type.id,
              })),
            ]}
            className="sm:w-48"
            onValueChange={(value) =>
              onUpdateParams({
                changeTypeId: value === 'all' ? undefined : value,
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
