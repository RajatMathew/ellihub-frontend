import { useState } from 'react';

import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import {
  useProjectCostCodePickerOptions,
  type ProjectPickerOption,
} from '@/modules/project/hooks/use-project-picker-options';

/**
 * One line's cost code, picked from the project's own cost codes through the
 * same select the PO form uses. Elliot's match, when it found one, is the
 * starting selection; otherwise the line starts empty and the user picks.
 */
export function RecordCostCodeSelect({
  projectId,
  costCodeId,
  costCodeLabel,
  disabled,
  required,
  onChange,
}: {
  projectId: string;
  costCodeId: string | null;
  costCodeLabel: string | null;
  disabled: boolean;
  /** A PO line must carry one; an RFQ deliverable may leave it blank. */
  required: boolean;
  onChange: (costCode: { costCodeId: string | null; costCodeLabel: string | null }) => void;
}) {
  const [search, setSearch] = useState('');
  const selected: ProjectPickerOption | null =
    costCodeId && costCodeLabel ? { value: costCodeId, label: costCodeLabel } : null;
  const picker = useProjectCostCodePickerOptions({
    projectId,
    search,
    selectedOptions: selected ? [selected] : [],
    // Every line on the card shares this scope, so idle selects share one
    // request through the query cache rather than fetching per row.
    queryScope: 'elliot-record-line-cost-code',
    enabled: !disabled,
  });

  return (
    <InfiniteSearchSelect
      options={picker.options}
      value={costCodeId}
      selectedOption={selected}
      onValueChange={() => undefined}
      onOptionChange={(option) => {
        if (!option && required) return;
        onChange({ costCodeId: option?.value ?? null, costCodeLabel: option?.label ?? null });
      }}
      search={search}
      onSearchChange={setSearch}
      isLoading={picker.isLoading}
      isFetchingNextPage={picker.isFetchingNextPage}
      hasNextPage={picker.hasNextPage}
      onFetchNextPage={picker.fetchNextPage}
      disabled={disabled}
      size="md"
      triggerClassName="h-7 w-full min-w-28 border-transparent px-1.5 text-xs shadow-none hover:border-input"
      placeholder={required ? 'Pick a cost code' : 'None'}
      searchPlaceholder="Search cost codes…"
      emptyMessage="No cost codes on this project."
    />
  );
}
