import { useRef } from 'react';

import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import {
  ProjectFilterTabs,
  type ProjectFilterTabOption,
} from '@/modules/project/components/shared';
import type { RFQListParamPatch } from '@/modules/project/hooks/rfq';
import type { Lookup } from '@/modules/project/schemas/lookup.schema';
import { ChevronRight, ListFilterPlus } from 'lucide-react';

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
  const tabsScrollRef = useRef<HTMLDivElement>(null);
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
  const scrollTabsForward = () => {
    const scrollElement = tabsScrollRef.current;

    if (!scrollElement) return;

    scrollElement.scrollBy({
      left: Math.max(scrollElement.clientWidth * 0.75, 180),
      behavior: 'smooth',
    });
  };

  return (
    <TableCardHeader
      title={
        <div className="relative flex min-h-11 min-w-0 max-w-full items-stretch overflow-hidden pr-12 sm:w-[min(42vw,36rem)] lg:w-[min(46vw,42rem)] xl:w-[min(48vw,46rem)]">
          <div
            ref={tabsScrollRef}
            className="flex min-w-0 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <ProjectFilterTabs
              value={trackFilter}
              options={trackOptions}
              className="w-max min-w-max flex-nowrap pr-16"
              onValueChange={(value) => onUpdateParams({ track: value, page: undefined })}
            />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-24 items-center justify-center bg-gradient-to-r from-card-header/0 via-card-header/90 to-card-header">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Scroll for more filters"
                  className="pointer-events-auto flex size-5 cursor-pointer items-center justify-center rounded-full border border-table-card-header-foreground/25 bg-card-header text-table-card-header-foreground/80 shadow-xs shadow-black/10 transition-colors hover:border-table-card-header-foreground/45 hover:text-table-card-header-foreground"
                  onClick={scrollTabsForward}
                >
                  <ChevronRight className="size-3.5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-sans text-xs font-medium">
                Scroll for more filters
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      }
      actions={
        <TableCardHeaderToolbar className="flex-wrap">
          <TableCardHeaderSearch
            value={searchInput}
            placeholder="Search RFQs..."
            onChange={onSearchChange}
            className="sm:w-60"
          />
          <TableCardHeaderSelect
            value={statusFilter ?? 'all'}
            placeholder="All Statuses"
            icon={ListFilterPlus}
            options={[{ value: 'all', label: 'All Statuses' }, ...RFQ_STATUS_FILTER_OPTIONS]}
            className="sm:w-36"
            onValueChange={(value) =>
              onUpdateParams({
                statusId: value === 'all' ? undefined : value,
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
